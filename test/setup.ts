import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// jsdom has no layout engine; give elements a plausible size so fit/clamp math runs.
Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1000 });
Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 800 });
Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 600 });
Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 400 });
Element.prototype.getBoundingClientRect = function () {
  return { x: 0, y: 0, left: 0, top: 0, width: 1000, height: 800, right: 1000, bottom: 800, toJSON() {} } as DOMRect;
};
if (!("PointerEvent" in window)) {
  // jsdom does not ship PointerEvent; a MouseEvent with pointer fields is enough for the gesture code.
  class PointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  (window as unknown as { PointerEvent: typeof PointerEvent }).PointerEvent = PointerEvent;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}
