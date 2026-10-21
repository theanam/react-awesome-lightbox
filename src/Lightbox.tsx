import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";

declare const process: { env?: Record<string, string | undefined> } | undefined;
import { createPortal } from "react-dom";
import {
  BrokenImageIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ResetIcon,
  RotateLeftIcon,
  RotateRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "./icons";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface LightboxImage {
  /** Image URL. */
  url: string;
  /** Shown in the toolbar and used as the default alt text. */
  title?: string;
  /** Alt text for the image. Falls back to `title`. */
  alt?: string;
}

export type LightboxImageInput = string | LightboxImage;

export type ButtonAlign = "flex-start" | "center" | "flex-end";

export interface LightboxLabels {
  close: string;
  previous: string;
  next: string;
  zoomIn: string;
  zoomOut: string;
  rotateLeft: string;
  rotateRight: string;
  reset: string;
  dialog: string;
  loading: string;
  loadError: string;
}

export type LightboxCloseEvent = SyntheticEvent | KeyboardEvent | undefined;

export interface LightboxProps {
  /** URL of the image to show in single image mode. Ignored when `images` is set. */
  image?: string;
  /** Title for the single image. */
  title?: string;
  /** Array of images for multi image mode. Strings or `{ url, title, alt }` objects. */
  images?: readonly LightboxImageInput[];
  /** Index of the image to show first in multi image mode. @default 0 */
  startIndex?: number;
  /** Called when the lightbox wants to close (close button, Escape, click outside). */
  onClose?: (event: LightboxCloseEvent) => void;
  /** Called with the new index whenever the image changes in multi image mode. */
  onNavigateImage?: (index: number) => void;
  /** Zoom step for buttons, keyboard and wheel. 0.3 means 30%. @default 0.3 */
  zoomStep?: number;
  /** Zoom level applied on double click / double tap. 0 disables it. @default 4 */
  doubleClickZoom?: number;
  /** Maximum zoom level. @default 10 */
  maxZoom?: number;
  /** Show zoom controls and allow zoom gestures. @default true */
  allowZoom?: boolean;
  /** Show rotate controls. @default true */
  allowRotate?: boolean;
  /** Show the reset button when the image is transformed. @default true */
  allowReset?: boolean;
  /** Zoom with the mouse wheel / trackpad. @default true */
  wheelZoom?: boolean;
  /** Pinch to zoom on touch devices. @default true */
  pinchZoom?: boolean;
  /** Wrap around when navigating past the first or last image. @default true */
  loop?: boolean;
  /** Toolbar alignment. @default "flex-end" */
  buttonAlign?: ButtonAlign;
  /** Show the image title in the toolbar. @default true */
  showTitle?: boolean;
  /** Show the "n / total" counter in multi image mode. @default true */
  showCounter?: boolean;
  /** Enable keyboard shortcuts. @default true */
  keyboardInteraction?: boolean;
  /** Close when the backdrop is clicked while not zoomed in. @default true */
  clickOutsideToExit?: boolean;
  /** Preload the previous and next image in multi image mode. @default true */
  preload?: boolean;
  /**
   * Render into `document.body` (true), into the given element, or inline (false).
   * Rendering in a portal keeps the lightbox out of parents with `overflow: hidden`
   * or `transform`. @default true
   */
  portal?: boolean | HTMLElement;
  /** Extra class on the root element. Handy for scoping CSS variable overrides. */
  className?: string;
  /** Inline styles on the root element. */
  style?: CSSProperties;
  /** Override the accessible labels / tooltips, for localisation. */
  labels?: Partial<LightboxLabels>;
}

interface Transform {
  x: number;
  y: number;
  zoom: number;
  rotate: number;
}

type LoadStatus = "loading" | "loaded" | "error";

interface Pointer {
  x: number;
  y: number;
  type: string;
}

type Gesture =
  | {
      kind: "pan";
      pointerId: number;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
      moved: boolean;
      onBackdrop: boolean;
    }
  | {
      kind: "pinch";
      startDistance: number;
      startZoom: number;
      startX: number;
      startY: number;
      startMidX: number;
      startMidY: number;
    };

/* ------------------------------------------------------------------ */
/* Constants and helpers                                               */
/* ------------------------------------------------------------------ */

const IDENTITY: Transform = { x: 0, y: 0, zoom: 1, rotate: 0 };
const KEYBOARD_PAN_STEP = 40;
const SWIPE_THRESHOLD = 50;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE = 30;

export const defaultLabels: LightboxLabels = {
  close: "Close",
  previous: "Previous image",
  next: "Next image",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  rotateLeft: "Rotate left",
  rotateRight: "Rotate right",
  reset: "Reset",
  dialog: "Image viewer",
  loading: "Loading",
  loadError: "Could not load image",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isTransformed = (t: Transform) => t.x !== 0 || t.y !== 0 || t.zoom !== 1 || t.rotate % 360 !== 0;

const toCss = (t: Transform, fit: number) =>
  `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.zoom * fit}) rotate(${t.rotate}deg)`;

const normalize = (input: LightboxImageInput | undefined): LightboxImage | null => {
  if (!input) return null;
  if (typeof input === "string") return input ? { url: input } : null;
  return input.url ? input : null;
};

const distance = (a: Pointer, b: Pointer) => Math.hypot(a.x - b.x, a.y - b.y);

const isDev = () => typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

let openCount = 0;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function Lightbox(props: LightboxProps) {
  const {
    image,
    title,
    images,
    startIndex = 0,
    onClose,
    onNavigateImage,
    zoomStep = 0.3,
    doubleClickZoom = 4,
    maxZoom = 10,
    allowZoom = true,
    allowRotate = true,
    allowReset = true,
    wheelZoom = true,
    pinchZoom = true,
    loop = true,
    buttonAlign = "flex-end",
    showTitle = true,
    showCounter = true,
    keyboardInteraction = true,
    clickOutsideToExit = true,
    preload = true,
    portal = true,
    className,
    style,
    labels: labelOverrides,
  } = props;

  const labels = { ...defaultLabels, ...labelOverrides };
  const multi = Array.isArray(images) && images.length > 0;
  const count = multi ? images.length : 1;

  /* ----- state ----- */
  const [currentState, setCurrent] = useState(() => (multi ? clamp(startIndex, 0, images.length - 1) : 0));
  const current = clamp(currentState, 0, count - 1);
  const [transform, setTransformState] = useState<Transform>(IDENTITY);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [fit, setFit] = useState(1);
  const [gesturing, setGesturing] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* ----- refs ----- */
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const liveRef = useRef<Transform>(IDENTITY); // source of truth for the transform
  const fitRef = useRef(1);
  const rafRef = useRef(0);
  const pointersRef = useRef(new Map<number, Pointer>());
  const gestureRef = useRef<Gesture | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;
  const propsRef = useRef(props);
  propsRef.current = props;

  const titleId = useId();

  const currentImage = multi ? normalize(images[current]) : normalize(image ? { url: image, title } : undefined);
  const currentTitle = currentImage?.title ?? (multi ? "" : title ?? "");
  const currentAlt = currentImage?.alt ?? currentTitle;

  /* ----- transform plumbing ----- */

  const writeDom = useCallback(() => {
    rafRef.current = 0;
    const img = imgRef.current;
    if (img) img.style.transform = toCss(liveRef.current, fitRef.current);
  }, []);

  /** Update the transform without re-rendering React (used during continuous gestures). */
  const setLive = useCallback(
    (next: Transform) => {
      liveRef.current = next;
      if (!rafRef.current) rafRef.current = requestAnimationFrame(writeDom);
    },
    [writeDom],
  );

  /** Commit the transform to React state (re-renders the toolbar etc.). */
  const commit = useCallback((next: Transform) => {
    liveRef.current = next;
    setTransformState(next);
  }, []);

  /** Keep the image from being panned completely out of view. */
  const clampPan = useCallback((t: Transform): Transform => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (t.zoom <= 1) return { ...t, x: 0, y: 0 };
    if (!img || !canvas) return t;
    const rotated = Math.abs(t.rotate % 180) === 90;
    const scale = t.zoom * fitRef.current;
    const w = (rotated ? img.offsetHeight : img.offsetWidth) * scale;
    const h = (rotated ? img.offsetWidth : img.offsetHeight) * scale;
    const maxX = Math.max(0, (w - canvas.clientWidth) / 2);
    const maxY = Math.max(0, (h - canvas.clientHeight) / 2);
    return { ...t, x: clamp(t.x, -maxX, maxX), y: clamp(t.y, -maxY, maxY) };
  }, []);

  /** Zoom to `zoom`, keeping the canvas point (px, py) (relative to canvas centre) fixed. */
  const zoomAbout = useCallback(
    (t: Transform, zoom: number, px: number, py: number): Transform => {
      const z = clamp(zoom, 1, maxZoom);
      if (z <= 1) return { ...t, x: 0, y: 0, zoom: 1 };
      const ratio = z / t.zoom;
      return clampPan({ ...t, zoom: z, x: px - ratio * (px - t.x), y: py - ratio * (py - t.y) });
    },
    [clampPan, maxZoom],
  );

  /** Convert a client point to coordinates relative to the canvas centre. */
  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - (rect.left + rect.width / 2), y: clientY - (rect.top + rect.height / 2) };
  }, []);

  /* ----- actions ----- */

  const reset = useCallback(() => commit(IDENTITY), [commit]);

  const stepZoom = useCallback(
    (direction: 1 | -1, px = 0, py = 0) => {
      const t = liveRef.current;
      const factor = direction > 0 ? 1 + zoomStep : 1 / (1 + zoomStep);
      let next = t.zoom * factor;
      // snap back to exactly 1 instead of hovering at 1.0000001
      if (direction < 0 && next < 1 + zoomStep / 4) next = 1;
      commit(zoomAbout(t, next, px, py));
    },
    [commit, zoomAbout, zoomStep],
  );

  const rotate = useCallback(
    (direction: 1 | -1) => {
      const t = liveRef.current;
      commit({ ...t, rotate: t.rotate + 90 * direction });
    },
    [commit],
  );

  const pan = useCallback(
    (dx: number, dy: number) => {
      const t = liveRef.current;
      if (t.zoom <= 1) return;
      commit(clampPan({ ...t, x: t.x + dx, y: t.y + dy }));
    },
    [clampPan, commit],
  );

  const exit = useCallback((event: LightboxCloseEvent) => {
    const { onClose: close } = propsRef.current;
    if (typeof close === "function") {
      close(event);
    } else if (isDev()) {
      console.warn("[react-awesome-lightbox] No `onClose` handler was passed; the close button will do nothing.");
    }
  }, []);

  const navigate = useCallback(
    (direction: 1 | -1) => {
      if (!multi) return;
      const index = currentRef.current;
      let next = index + direction;
      if (next >= count) next = loop ? 0 : count - 1;
      if (next < 0) next = loop ? count - 1 : 0;
      if (next === index) return;
      currentRef.current = next;
      commit(IDENTITY);
      setStatus("loading");
      setCurrent(next);
      propsRef.current.onNavigateImage?.(next);
    },
    [commit, count, loop, multi],
  );

  const toggleDoubleClickZoom = useCallback(
    (clientX: number, clientY: number) => {
      if (!allowZoom || !doubleClickZoom) return;
      const t = liveRef.current;
      if (t.zoom > 1) {
        commit({ ...t, x: 0, y: 0, zoom: 1 });
        return;
      }
      const p = toCanvasPoint(clientX, clientY);
      commit(zoomAbout(t, doubleClickZoom, p.x, p.y));
    },
    [allowZoom, commit, doubleClickZoom, toCanvasPoint, zoomAbout],
  );

  /* ----- mount / unmount effects ----- */

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    openCount += 1;
    document.body.classList.add("lb-open");
    previousFocusRef.current = document.activeElement;
    rootRef.current?.focus({ preventScroll: true });
    return () => {
      openCount -= 1;
      if (openCount <= 0) {
        openCount = 0;
        document.body.classList.remove("lb-open");
      }
      const previous = previousFocusRef.current;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [mounted]);

  /* ----- keyboard ----- */

  const handleKeyDown = useCallback(
    (e: KeyboardEvent | ReactKeyboardEvent) => {
      if (e.defaultPrevented) return;
      const t = liveRef.current;
      const zoomed = t.zoom > 1;
      switch (e.key) {
        case "ArrowLeft":
          if (zoomed) pan(KEYBOARD_PAN_STEP, 0);
          else navigate(-1);
          break;
        case "ArrowRight":
          if (zoomed) pan(-KEYBOARD_PAN_STEP, 0);
          else navigate(1);
          break;
        case "ArrowUp":
          if (zoomed) pan(0, KEYBOARD_PAN_STEP);
          else return;
          break;
        case "ArrowDown":
          if (zoomed) pan(0, -KEYBOARD_PAN_STEP);
          else return;
          break;
        case "+":
        case "=":
          if (allowZoom) stepZoom(1);
          break;
        case "-":
        case "_":
          if (allowZoom) stepZoom(-1);
          break;
        case "0":
          if (allowReset) reset();
          break;
        case "r":
          if (allowRotate) rotate(1);
          break;
        case "R":
          if (allowRotate) rotate(-1);
          break;
        case "Escape":
          if (allowReset && isTransformed(t)) reset();
          else exit(e);
          break;
        case "Tab": {
          // keep focus inside the dialog
          const root = rootRef.current;
          if (!root) return;
          const isVisible = (el: HTMLElement) => {
            for (let node: HTMLElement | null = el; node && node !== root; node = node.parentElement) {
              if (getComputedStyle(node).display === "none") return false;
            }
            return true;
          };
          const focusable = Array.from(
            root.querySelectorAll<HTMLElement>("button:not([disabled]), [tabindex]:not([tabindex='-1'])"),
          ).filter(isVisible);
          if (focusable.length === 0) {
            e.preventDefault();
            return;
          }
          const first = focusable[0]!;
          const last = focusable[focusable.length - 1]!;
          const active = document.activeElement;
          if (e.shiftKey && (active === first || active === root)) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && (active === last || active === root)) {
            e.preventDefault();
            first.focus();
          }
          return;
        }
        default:
          return;
      }
      e.preventDefault();
    },
    [allowReset, allowRotate, allowZoom, exit, navigate, pan, reset, rotate, stepZoom],
  );

  useEffect(() => {
    if (!keyboardInteraction || typeof document === "undefined") return;
    const listener = (e: KeyboardEvent) => {
      // Ignore keys typed into inputs that may live outside the dialog.
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      handleKeyDown(e);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [handleKeyDown, keyboardInteraction]);

  /* ----- wheel zoom (needs a non-passive listener) ----- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !allowZoom || !wheelZoom) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toCanvasPoint(e.clientX, e.clientY);
      // trackpad pinch arrives as wheel + ctrlKey with small deltas; scale the step down
      const magnitude = e.ctrlKey ? Math.min(1, Math.abs(e.deltaY) / 50) : 1;
      const t = liveRef.current;
      const factor = e.deltaY < 0 ? 1 + zoomStep * magnitude : 1 / (1 + zoomStep * magnitude);
      let next = t.zoom * factor;
      if (next < 1 + zoomStep / 4) next = 1;
      commit(zoomAbout(t, next, p.x, p.y));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [allowZoom, commit, toCanvasPoint, wheelZoom, zoomStep]);

  /* ----- image loading ----- */

  const src = currentImage?.url ?? "";

  // onLoad does not fire for images that are already decoded (cached, or the URL did not
  // change between two entries), so check as soon as the element attaches (#8).
  const attachImg = useCallback((el: HTMLImageElement | null) => {
    imgRef.current = el;
    if (el && el.complete && el.naturalWidth > 0) setStatus("loaded");
  }, []);

  useEffect(() => {
    if (!multi || !preload || typeof Image === "undefined") return;
    const neighbours = [current + 1, current - 1]
      .map((i) => (loop ? (i + count) % count : i))
      .filter((i) => i >= 0 && i < count && i !== current);
    const handles = neighbours.map((i) => {
      const url = normalize(images[i])?.url;
      if (!url) return null;
      const pre = new Image();
      pre.src = url;
      return pre;
    });
    return () => handles.forEach((h) => h && (h.src = ""));
  }, [count, current, images, loop, multi, preload]);

  /* ----- fit scale for rotated images (#11) and resize handling ----- */

  const measure = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.offsetWidth || !img.offsetHeight) return;
    const rotated = Math.abs(liveRef.current.rotate % 180) === 90;
    const nextFit = rotated
      ? Math.min(1, canvas.clientWidth / img.offsetHeight, canvas.clientHeight / img.offsetWidth)
      : 1;
    if (nextFit !== fitRef.current) {
      fitRef.current = nextFit;
      setFit(nextFit);
    }
    const clamped = clampPan(liveRef.current);
    if (clamped.x !== liveRef.current.x || clamped.y !== liveRef.current.y) commit(clamped);
  }, [clampPan, commit]);

  useLayoutEffect(measure, [measure, transform.rotate, status, current]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [measure]);

  /* ----- pointer gestures: pan, pinch, swipe, double tap ----- */

  const endGesture = useCallback(() => {
    gestureRef.current = null;
    setGesturing(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    commit(clampPan(liveRef.current));
  }, [clampPan, commit]);

  const startPan = useCallback((pointerId: number, p: Pointer, onBackdrop = false) => {
    const t = liveRef.current;
    gestureRef.current = {
      kind: "pan",
      pointerId,
      startX: p.x,
      startY: p.y,
      originX: t.x,
      originY: t.y,
      moved: false,
      onBackdrop,
    };
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const target = e.target as HTMLElement;
      if (target.closest("button")) return; // let buttons behave normally
      const pointers = pointersRef.current;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
      e.currentTarget.setPointerCapture(e.pointerId);

      if (pointers.size === 2 && allowZoom && pinchZoom) {
        const [a, b] = Array.from(pointers.values()) as [Pointer, Pointer];
        const t = liveRef.current;
        gestureRef.current = {
          kind: "pinch",
          startDistance: Math.max(1, distance(a, b)),
          startZoom: t.zoom,
          startX: t.x,
          startY: t.y,
          startMidX: (a.x + b.x) / 2,
          startMidY: (a.y + b.y) / 2,
        };
        setGesturing(true);
      } else if (pointers.size === 1) {
        startPan(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType }, target === e.currentTarget);
        if (liveRef.current.zoom > 1) setGesturing(true);
      }
    },
    [allowZoom, pinchZoom, startPan],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const pointers = pointersRef.current;
      const pointer = pointers.get(e.pointerId);
      if (!pointer) return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      const gesture = gestureRef.current;
      if (!gesture) return;

      if (gesture.kind === "pinch" && pointers.size >= 2) {
        const [a, b] = Array.from(pointers.values()) as [Pointer, Pointer];
        const ratio = distance(a, b) / gesture.startDistance;
        const zoom = clamp(gesture.startZoom * ratio, 1, maxZoom);
        const mid = toCanvasPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
        const startMid = toCanvasPoint(gesture.startMidX, gesture.startMidY);
        const base: Transform = { ...liveRef.current, x: gesture.startX, y: gesture.startY, zoom: gesture.startZoom };
        const zoomed = zoomAbout(base, zoom, startMid.x, startMid.y);
        setLive(clampPan({ ...zoomed, x: zoomed.x + (mid.x - startMid.x), y: zoomed.y + (mid.y - startMid.y) }));
        return;
      }

      if (gesture.kind === "pan" && gesture.pointerId === e.pointerId) {
        const dx = e.clientX - gesture.startX;
        const dy = e.clientY - gesture.startY;
        if (!gesture.moved && Math.hypot(dx, dy) > 3) gesture.moved = true;
        if (liveRef.current.zoom > 1) {
          setLive(clampPan({ ...liveRef.current, x: gesture.originX + dx, y: gesture.originY + dy }));
        }
      }
    },
    [clampPan, maxZoom, setLive, toCanvasPoint, zoomAbout],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const pointers = pointersRef.current;
      const pointer = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      const gesture = gestureRef.current;

      if (gesture?.kind === "pinch") {
        if (pointers.size >= 2) return;
        endGesture();
        // continue panning with the remaining finger
        const [remainingId, remaining] = Array.from(pointers.entries())[0] ?? [];
        if (remainingId !== undefined && remaining) {
          startPan(remainingId, remaining);
          if (liveRef.current.zoom > 1) setGesturing(true);
        }
        return;
      }

      if (gesture?.kind === "pan" && gesture.pointerId === e.pointerId && pointer) {
        const dx = e.clientX - gesture.startX;
        const dy = e.clientY - gesture.startY;
        const wasZoomed = liveRef.current.zoom > 1;
        endGesture();

        if (!wasZoomed && pointer.type === "touch" && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
          navigate(dx < 0 ? 1 : -1);
          lastTapRef.current = null;
          return;
        }

        if (!gesture.moved) {
          if (gesture.onBackdrop) {
            lastTapRef.current = null;
            if (clickOutsideToExit && !wasZoomed) exit(e);
            return;
          }
          const now = Date.now();
          const last = lastTapRef.current;
          if (
            last &&
            now - last.time < DOUBLE_TAP_MS &&
            Math.hypot(last.x - e.clientX, last.y - e.clientY) < DOUBLE_TAP_DISTANCE
          ) {
            lastTapRef.current = null;
            toggleDoubleClickZoom(e.clientX, e.clientY);
            return;
          }
          lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
        }
        return;
      }

      if (pointers.size === 0 && gesture) endGesture();
    },
    [clickOutsideToExit, endGesture, exit, navigate, startPan, toggleDoubleClickZoom],
  );

  /* ----- render ----- */

  if (!currentImage) {
    if (isDev()) console.warn("[react-awesome-lightbox] Not rendering: no `image` or `images` were supplied.");
    return null;
  }
  if (portal && !mounted) return null; // SSR: wait for the client

  const live = liveRef.current;
  const zoomed = live.zoom > 1;
  const showReset = allowReset && isTransformed(live);
  const canNavigate = multi && (loop || count > 1);
  const atStart = !loop && current === 0;
  const atEnd = !loop && current === count - 1;

  const button = (
    label: string,
    onClick: () => void,
    icon: ReactNode,
    extra: { className?: string; disabled?: boolean; hidden?: boolean } = {},
  ) =>
    extra.hidden ? null : (
      <button
        type="button"
        className={`lb-button ${extra.className ?? ""}`.trim()}
        aria-label={label}
        title={label}
        disabled={extra.disabled}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {icon}
      </button>
    );

  const content = (
    <div
      ref={rootRef}
      className={`lb-root ${className ?? ""}`.trim()}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label={showTitle && currentTitle ? undefined : labels.dialog}
      aria-labelledby={showTitle && currentTitle ? titleId : undefined}
      tabIndex={-1}
    >
      <div className={`lb-toolbar lb-toolbar--${buttonAlign}`}>
        {showTitle && (currentTitle || (showCounter && multi)) ? (
          <div className="lb-title">
            {currentTitle ? (
              <span id={titleId} className="lb-title-text" title={currentTitle}>
                {currentTitle}
              </span>
            ) : null}
            {showCounter && multi ? (
              <span className="lb-counter" aria-live="polite">
                {current + 1} / {count}
              </span>
            ) : null}
          </div>
        ) : null}
        {button(labels.reset, reset, <ResetIcon />, {
          className: "lb-button--reset lb-hide-mobile",
          hidden: !allowReset || (!showReset && buttonAlign !== "center"),
          disabled: !showReset,
        })}
        {button(labels.previous, () => navigate(-1), <ChevronLeftIcon />, {
          className: "lb-button--prev lb-hide-mobile",
          hidden: !canNavigate,
          disabled: atStart,
        })}
        {button(labels.next, () => navigate(1), <ChevronRightIcon />, {
          className: "lb-button--next lb-hide-mobile",
          hidden: !canNavigate,
          disabled: atEnd,
        })}
        {button(labels.zoomIn, () => stepZoom(1), <ZoomInIcon />, {
          className: "lb-button--zoom-in",
          hidden: !allowZoom,
          disabled: live.zoom >= maxZoom,
        })}
        {button(labels.zoomOut, () => stepZoom(-1), <ZoomOutIcon />, {
          className: "lb-button--zoom-out",
          hidden: !allowZoom,
          disabled: !zoomed,
        })}
        {button(labels.rotateLeft, () => rotate(-1), <RotateLeftIcon />, {
          className: "lb-button--rotate-left",
          hidden: !allowRotate,
        })}
        {button(labels.rotateRight, () => rotate(1), <RotateRightIcon />, {
          className: "lb-button--rotate-right",
          hidden: !allowRotate,
        })}
        {button(labels.close, () => exit(undefined), <CloseIcon />, { className: "lb-button--close" })}
      </div>

      <div
        ref={canvasRef}
        className={[
          "lb-canvas",
          zoomed ? "lb-canvas--zoomed" : "",
          gesturing && zoomed ? "lb-canvas--panning" : "",
          !clickOutsideToExit || zoomed ? "lb-canvas--no-exit" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {status === "loading" ? <div className="lb-spinner" role="status" aria-label={labels.loading} /> : null}
        {status === "error" ? (
          <div className="lb-error" role="alert">
            <BrokenImageIcon />
            <span>{labels.loadError}</span>
          </div>
        ) : null}
        <img
          ref={attachImg}
          key={`${current}:${src}`}
          className={[
            "lb-img",
            status === "loading" ? "lb-img--loading" : "",
            status === "error" ? "lb-img--error" : "",
            gesturing ? "lb-img--gesturing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          src={src}
          alt={currentAlt}
          title={currentTitle || undefined}
          draggable={false}
          decoding="async"
          style={{ transform: toCss(live, fit) }}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
        {canNavigate
          ? button(labels.previous, () => navigate(-1), <ChevronLeftIcon />, {
              className: "lb-nav lb-nav--prev",
              disabled: atStart,
            })
          : null}
        {canNavigate
          ? button(labels.next, () => navigate(1), <ChevronRightIcon />, {
              className: "lb-nav lb-nav--next",
              disabled: atEnd,
            })
          : null}
        <div className="lb-mobile-controls">
          {canNavigate ? button(labels.previous, () => navigate(-1), <ChevronLeftIcon />, { disabled: atStart }) : null}
          {showReset ? button(labels.reset, reset, <ResetIcon />) : null}
          {canNavigate ? button(labels.next, () => navigate(1), <ChevronRightIcon />, { disabled: atEnd }) : null}
        </div>
      </div>
    </div>
  );

  if (!portal) return content;
  const target = portal === true ? document.body : portal;
  return createPortal(content, target);
}

export default Lightbox;
