# Changelog

## 2.0.0

Complete rewrite in TypeScript as a function component. Same component, same core props, modern internals.

### Breaking changes
- **React 18 or 19 required.** `react-dom` is now a peer dependency as well. Stay on 1.9.x for React 16/17.
- **Package output moved** from `build/` to `dist/` and is now ESM + CommonJS with bundled type declarations.
  Import the stylesheet as `react-awesome-lightbox/style.css`. The old `react-awesome-lightbox/build/style.css`
  path still resolves to the same file, so existing imports keep working.
- **All CSS class names are prefixed with `lb-`** (`.lb-button--close`, `.lb-nav--next`, …). The unprefixed
  `close`, `next`, `prev`, `reload` classes that collided with Bootstrap and friends are gone (#4). If you had custom
  CSS targeting the old names, update the selectors. Theming is now done with CSS custom properties, see the README.
- **Renders in a portal** on `document.body` by default so parents with `overflow: hidden` or `transform` no longer
  clip it. Pass `portal={false}` for the old inline behaviour.
- Toolbar controls are real `<button>` elements. The body class while open is `lb-open` (was `lb-open-lightbox`,
  which never had any styles).
- Keyboard shortcuts fire on `keydown` instead of `keyup`, so holding an arrow key pans continuously.
- Zoom is capped by the new `maxZoom` prop (default 10). It was unbounded before.

### New
- Pinch to zoom, mouse wheel / trackpad zoom, swipe to navigate, double tap on touch devices.
- Pointer Events replace the separate mouse and touch handlers. Panning is clamped so the image cannot be lost
  off-screen, and gestures write to the DOM directly for 60 fps dragging without re-rendering React.
- Accessibility: `role="dialog"` with `aria-modal`, labelled buttons, focus moves into the lightbox and back to the
  trigger on close, focus is trapped while open, `prefers-reduced-motion` is honoured.
- Image counter (`showCounter`), `loop`, `wheelZoom`, `pinchZoom`, `maxZoom`, `preload`, `portal`, `className`,
  `style`, `labels` props. `images` entries accept an `alt`.
- Extra shortcuts: <kbd>0</kbd> resets, <kbd>r</kbd> / <kbd>Shift</kbd>+<kbd>r</kbd> rotate, <kbd>=</kbd> zooms in.
- Neighbouring images are preloaded in multi image mode.
- Broken images show an error state instead of spinning forever.
- Inline SVG icons that follow `currentColor`; stylesheet shrank from 23 KB to 5 KB.
- Full TypeScript types.

### Fixed
- Wide images are scaled to fit after a 90° rotation (#11).
- The image is never stretched by host CSS resets such as Tailwind preflight (#24).
- Close button appears faded under Bootstrap (#4).
- "Element type is invalid" in production builds with Vite caused by the old CommonJS-only bundle (#22).
- Page behind the lightbox no longer scrolls while it is open.

### Repo
- tsup build, Vitest + Testing Library suite, Vite demo in `demo/` (#7), CI on every push, npm publish from GitHub
  releases with provenance.

## 1.9.0

- Supports React 18 and 19 (peer dependency widened to `^16.8||^17||^18||^19`) — #18, #21, #23
- Published bundle rebuilt; it now actually includes `onNavigateImage` — #16
- Fixed loading spinner getting stuck on cached or duplicate images — #8
- Fixed image jumping when dragging after a reset or navigating to another image — #12
- Fixed image getting text-selected on quick clicks in Firefox — #10
- Build tooling moved to webpack 5; CI publishes only when the version is new
