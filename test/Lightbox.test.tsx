import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Lightbox } from "../src";

const images = [
  { url: "https://example.com/1.jpg", title: "One" },
  { url: "https://example.com/2.jpg", title: "Two" },
  "https://example.com/3.jpg",
];

const canvas = () => document.querySelector<HTMLDivElement>(".lb-canvas")!;
const img = () => document.querySelector<HTMLImageElement>(".lb-img")!;
const transformOf = () => img().style.transform;

const pointer = (type: "pointerDown" | "pointerUp" | "pointerMove", target: Element, init: Record<string, unknown>) =>
  fireEvent[type](target, { pointerId: 1, pointerType: "mouse", button: 0, isPrimary: true, ...init });

const tap = (target: Element, x = 500, y = 400, pointerType = "mouse") => {
  pointer("pointerDown", target, { clientX: x, clientY: y, pointerType });
  pointer("pointerUp", target, { clientX: x, clientY: y, pointerType });
};

/** Pretend the browser already has every image decoded (cached). */
const markImagesComplete = () => {
  Object.defineProperty(HTMLImageElement.prototype, "complete", { configurable: true, get: () => true });
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { configurable: true, get: () => 800 });
};
const unmarkImagesComplete = () => {
  Object.defineProperty(HTMLImageElement.prototype, "complete", { configurable: true, get: () => false });
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { configurable: true, get: () => 0 });
};

beforeEach(() => unmarkImagesComplete());
afterEach(() => vi.restoreAllMocks());

describe("rendering", () => {
  it("renders a single image with its title as a dialog in a portal", () => {
    const { container } = render(<Lightbox image="https://example.com/a.jpg" title="Hello" onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Hello" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("img", { name: "Hello" })).toHaveAttribute("src", "https://example.com/a.jpg");
    expect(container.querySelector(".lb-root")).toBeNull(); // portalled to body
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("renders inline when portal is false", () => {
    const { container } = render(<Lightbox image="https://example.com/a.jpg" portal={false} />);
    expect(container.querySelector(".lb-root")).not.toBeNull();
  });

  it("renders nothing and warns when no image is supplied", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Lightbox />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("locks body scroll while open and restores it on unmount", () => {
    const { unmount } = render(<Lightbox image="https://example.com/a.jpg" />);
    expect(document.body.classList.contains("lb-open")).toBe(true);
    unmount();
    expect(document.body.classList.contains("lb-open")).toBe(false);
  });

  it("moves focus into the dialog and returns it on close", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(<Lightbox image="https://example.com/a.jpg" />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("uses custom labels", () => {
    render(<Lightbox image="https://example.com/a.jpg" labels={{ close: "Schließen" }} />);
    expect(screen.getByRole("button", { name: "Schließen" })).toBeInTheDocument();
  });

  it("every class name is prefixed with lb-", () => {
    render(<Lightbox images={images} />);
    const classes = new Set<string>();
    document.querySelectorAll(".lb-root, .lb-root *").forEach((el) => el.classList.forEach((c) => classes.add(c)));
    expect([...classes].filter((c) => !c.startsWith("lb-"))).toEqual([]);
  });
});

describe("loading state", () => {
  it("shows a spinner until the image loads", () => {
    render(<Lightbox image="https://example.com/a.jpg" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.load(img());
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not get stuck when the image is already cached (#8)", () => {
    markImagesComplete();
    render(<Lightbox images={[images[0]!, images[0]!]} />);
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Next image" })[0]!);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows an error message when the image fails", () => {
    render(<Lightbox image="https://example.com/missing.jpg" />);
    fireEvent.error(img());
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load image");
  });
});

describe("navigation", () => {
  it("shows a counter, navigates, wraps around and reports the index", () => {
    const onNavigateImage = vi.fn();
    render(<Lightbox images={images} onNavigateImage={onNavigateImage} />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    const next = screen.getAllByRole("button", { name: "Next image" })[0]!;
    fireEvent.click(next);
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(onNavigateImage).toHaveBeenLastCalledWith(1);
    fireEvent.click(next);
    fireEvent.click(next); // wraps to the first image
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(onNavigateImage).toHaveBeenLastCalledWith(0);
  });

  it("respects startIndex and loop=false", () => {
    render(<Lightbox images={images} startIndex={2} loop={false} />);
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    screen.getAllByRole("button", { name: "Next image" }).forEach((b) => expect(b).toBeDisabled());
    screen.getAllByRole("button", { name: "Previous image" }).forEach((b) => expect(b).toBeEnabled());
  });

  it("navigates with arrow keys when not zoomed", () => {
    render(<Lightbox images={images} />);
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("Two")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("One")).toBeInTheDocument();
  });

  it("navigates on horizontal touch swipe", () => {
    render(<Lightbox images={images} />);
    pointer("pointerDown", img(), { clientX: 500, clientY: 400, pointerType: "touch" });
    pointer("pointerMove", img(), { clientX: 350, clientY: 405, pointerType: "touch" });
    pointer("pointerUp", img(), { clientX: 350, clientY: 405, pointerType: "touch" });
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("resets zoom and rotation when changing image", () => {
    render(<Lightbox images={images} />);
    fireEvent.click(screen.getByRole("button", { name: "Rotate right" }));
    expect(transformOf()).toContain("rotate(90deg)");
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(transformOf()).toContain("rotate(0deg)");
  });
});

describe("zoom, rotate, reset", () => {
  it("zoom buttons enable/disable correctly and reset appears when transformed", () => {
    render(<Lightbox image="https://example.com/a.jpg" zoomStep={0.5} />);
    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    expect(zoomOut).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(zoomOut).toBeEnabled();
    expect(transformOf()).toContain("scale(1.5)");
    fireEvent.click(screen.getAllByRole("button", { name: "Reset" })[0]!);
    expect(transformOf()).toContain("scale(1)");
    expect(zoomOut).toBeDisabled();
  });

  it("caps zoom at maxZoom", () => {
    render(<Lightbox image="https://example.com/a.jpg" zoomStep={1} maxZoom={3} />);
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    expect(transformOf()).toContain("scale(3)");
    expect(zoomIn).toBeDisabled();
  });

  it("supports keyboard zoom and rotate shortcuts", () => {
    render(<Lightbox image="https://example.com/a.jpg" />);
    fireEvent.keyDown(document, { key: "+" });
    expect(transformOf()).toContain("scale(1.3)");
    fireEvent.keyDown(document, { key: "-" });
    expect(transformOf()).toContain("scale(1)");
    fireEvent.keyDown(document, { key: "r" });
    expect(transformOf()).toContain("rotate(90deg)");
    fireEvent.keyDown(document, { key: "R" });
    fireEvent.keyDown(document, { key: "R" });
    expect(transformOf()).toContain("rotate(-90deg)");
    fireEvent.keyDown(document, { key: "0" });
    expect(transformOf()).toContain("rotate(0deg)");
  });

  it("double tap zooms in about the tap point and double tap again resets", () => {
    render(<Lightbox image="https://example.com/a.jpg" doubleClickZoom={2} />);
    tap(img(), 700, 400);
    tap(img(), 700, 400);
    // (700,400) is 200px right of centre, so the zoom wants x = -200, but the 600px image
    // scaled 2x is 1200px wide in a 1000px canvas, so the pan is clamped to 100px.
    expect(transformOf()).toBe("translate3d(-100px, 0px, 0) scale(2) rotate(0deg)");
    tap(img(), 700, 400);
    tap(img(), 700, 400);
    expect(transformOf()).toContain("scale(1)");
  });

  it("pans with pointer drag when zoomed, and clamps to the image bounds", () => {
    render(<Lightbox image="https://example.com/a.jpg" doubleClickZoom={4} />);
    tap(img(), 500, 400);
    tap(img(), 500, 400);
    expect(transformOf()).toContain("scale(4)");
    pointer("pointerDown", img(), { clientX: 500, clientY: 400 });
    pointer("pointerMove", img(), { clientX: 600, clientY: 450 });
    pointer("pointerUp", img(), { clientX: 600, clientY: 450 });
    // image 600x400 scaled 4x = 2400x1600 in a 1000x800 canvas -> max pan 700/400
    expect(transformOf()).toBe("translate3d(100px, 50px, 0) scale(4) rotate(0deg)");
    pointer("pointerDown", img(), { clientX: 500, clientY: 400 });
    pointer("pointerMove", img(), { clientX: 5000, clientY: 4000 });
    pointer("pointerUp", img(), { clientX: 5000, clientY: 4000 });
    expect(transformOf()).toBe("translate3d(700px, 400px, 0) scale(4) rotate(0deg)");
  });

  it("pinch zooms with two pointers", () => {
    render(<Lightbox image="https://example.com/a.jpg" />);
    fireEvent.pointerDown(canvas(), { pointerId: 1, pointerType: "touch", clientX: 450, clientY: 400, isPrimary: true });
    fireEvent.pointerDown(canvas(), { pointerId: 2, pointerType: "touch", clientX: 550, clientY: 400 });
    fireEvent.pointerMove(canvas(), { pointerId: 1, pointerType: "touch", clientX: 350, clientY: 400 });
    fireEvent.pointerMove(canvas(), { pointerId: 2, pointerType: "touch", clientX: 650, clientY: 400 });
    fireEvent.pointerUp(canvas(), { pointerId: 2, pointerType: "touch", clientX: 650, clientY: 400 });
    fireEvent.pointerUp(canvas(), { pointerId: 1, pointerType: "touch", clientX: 350, clientY: 400 });
    expect(transformOf()).toContain("scale(3)");
  });

  it("scales a rotated wide image down to fit (#11)", () => {
    // image layout size is 600x400 (setup), canvas 1000x800: rotated 90deg its 600px width must fit 800px height
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 1200 });
    render(<Lightbox image="https://example.com/wide.jpg" />);
    fireEvent.click(screen.getByRole("button", { name: "Rotate right" }));
    // fit = min(1, 1000/400, 800/1200) = 0.6667
    expect(transformOf()).toContain(`scale(${800 / 1200})`);
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 600 });
  });
});

describe("closing", () => {
  it("close button and Escape call onClose", () => {
    const onClose = vi.fn();
    render(<Lightbox image="https://example.com/a.jpg" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("Escape resets a transformed image before closing", () => {
    const onClose = vi.fn();
    render(<Lightbox image="https://example.com/a.jpg" onClose={onClose} />);
    fireEvent.keyDown(document, { key: "+" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(transformOf()).toContain("scale(1)");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("tapping the backdrop closes, tapping the image does not", () => {
    const onClose = vi.fn();
    render(<Lightbox image="https://example.com/a.jpg" onClose={onClose} />);
    tap(img());
    expect(onClose).not.toHaveBeenCalled();
    tap(canvas());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on backdrop tap when zoomed or when clickOutsideToExit is false", () => {
    const onClose = vi.fn();
    const { unmount } = render(<Lightbox image="https://example.com/a.jpg" onClose={onClose} />);
    fireEvent.keyDown(document, { key: "+" });
    tap(canvas());
    expect(onClose).not.toHaveBeenCalled();
    unmount();
    render(<Lightbox image="https://example.com/a.jpg" onClose={onClose} clickOutsideToExit={false} />);
    tap(canvas());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores keyboard when keyboardInteraction is false", () => {
    const onClose = vi.fn();
    render(<Lightbox image="https://example.com/a.jpg" onClose={onClose} keyboardInteraction={false} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("warns instead of throwing when onClose is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Lightbox image="https://example.com/a.jpg" />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("onClose"));
  });
});

describe("focus trap", () => {
  it("cycles focus between the toolbar buttons with Tab", () => {
    render(<Lightbox image="https://example.com/a.jpg" allowRotate={false} />);
    const buttons = screen.getAllByRole("button");
    const last = buttons[buttons.length - 1]!;
    act(() => last.focus());
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
