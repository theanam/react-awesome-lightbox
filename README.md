# react-awesome-lightbox

Lightweight, accessible lightbox image viewer for React. Zoom, pan, rotate, pinch, swipe, full keyboard support.
Single or multi image mode. No dependencies besides React. Ships ESM, CommonJS and TypeScript types.

## 🚀 [See it in action](https://theanam.github.io/react-awesome-lightbox/)

![demo](https://imgur.com/rGnutjz.gif)

## Features

- Zoom with buttons, keyboard, mouse wheel / trackpad, double click, double tap and **pinch**
- Pan by dragging or with the arrow keys, clamped so the image never gets lost off-screen
- Rotate in 90° steps, wide images are scaled to fit when rotated
- Single image or gallery mode with wrap-around, counter, swipe to navigate and neighbour preloading
- Accessible: dialog semantics, labelled buttons, focus management and trapping, reduced-motion aware
- Themeable with CSS custom properties, no CSS-in-JS, 5 KB stylesheet
- Smooth 60 fps gestures (DOM writes during drag, no React re-renders)
- Fully typed, works with React 18 and 19, SSR safe

## Install

```sh
npm install react-awesome-lightbox
```

Requires React 18 or 19. For React 16/17 use version 1.9.x.

## Usage

```jsx
import { useState } from "react";
import Lightbox from "react-awesome-lightbox";
// import the stylesheet once, anywhere in your app
import "react-awesome-lightbox/style.css";

function Gallery() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && <Lightbox image="https://example.com/photo.jpg" title="A photo" onClose={() => setOpen(false)} />}
    </>
  );
}
```

The lightbox is open whenever it is rendered. Render it conditionally and flip the condition in `onClose`.

### Multiple images

```jsx
const images = [
  "https://example.com/1.jpg", // plain URL
  { url: "https://example.com/2.jpg", title: "Second image" }, // or an object
  { url: "https://example.com/3.jpg", title: "Third", alt: "Alt text for screen readers" },
];

{open && <Lightbox images={images} startIndex={1} onClose={() => setOpen(false)} />}
```

### Opening a specific image from a grid

```jsx
const [index, setIndex] = useState(null);

<div className="grid">
  {images.map((img, i) => (
    <img key={img.url} src={img.thumb} onClick={() => setIndex(i)} />
  ))}
</div>;

{index !== null && (
  <Lightbox images={images} startIndex={index} onNavigateImage={setIndex} onClose={() => setIndex(null)} />
)}
```

## Props

| Prop                  | Type                                   | Default      | Description                                                                                        |
| --------------------- | -------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `image`               | `string`                               |              | URL of the image in single image mode. Ignored when `images` is set.                               |
| `title`               | `string`                               |              | Title for the single image. Shown in the toolbar and used as alt text.                             |
| `images`              | `(string \| { url, title?, alt? })[]` |              | Gallery mode. Strings or objects.                                                                  |
| `startIndex`          | `number`                               | `0`          | Image to show first in gallery mode.                                                               |
| `onClose`             | `(event?) => void`                     |              | Called when the lightbox wants to close: close button, Escape, backdrop click.                     |
| `onNavigateImage`     | `(index: number) => void`              |              | Called with the new index when the image changes.                                                  |
| `zoomStep`            | `number`                               | `0.3`        | Zoom step for buttons, keyboard and wheel. `0.3` means 30%.                                        |
| `doubleClickZoom`     | `number`                               | `4`          | Zoom level on double click / double tap. `0` disables it.                                          |
| `maxZoom`             | `number`                               | `10`         | Maximum zoom level.                                                                                |
| `allowZoom`           | `boolean`                              | `true`       | Show zoom controls and allow zoom gestures.                                                        |
| `allowRotate`         | `boolean`                              | `true`       | Show rotate controls.                                                                              |
| `allowReset`          | `boolean`                              | `true`       | Show the reset button when the image is transformed.                                               |
| `wheelZoom`           | `boolean`                              | `true`       | Zoom with mouse wheel / trackpad.                                                                  |
| `pinchZoom`           | `boolean`                              | `true`       | Pinch to zoom on touch screens.                                                                    |
| `loop`                | `boolean`                              | `true`       | Wrap around at the first and last image.                                                           |
| `buttonAlign`         | `"flex-end" \| "flex-start" \| "center"` | `"flex-end"` | Toolbar alignment. `center` hides the title.                                                     |
| `showTitle`           | `boolean`                              | `true`       | Show the title in the toolbar.                                                                     |
| `showCounter`         | `boolean`                              | `true`       | Show `n / total` in gallery mode.                                                                  |
| `keyboardInteraction` | `boolean`                              | `true`       | Enable keyboard shortcuts.                                                                         |
| `clickOutsideToExit`  | `boolean`                              | `true`       | Close when the backdrop is clicked while not zoomed in.                                            |
| `preload`             | `boolean`                              | `true`       | Preload the previous and next image in gallery mode.                                               |
| `portal`              | `boolean \| HTMLElement`               | `true`       | Render into `document.body`, into the given element, or inline (`false`).                          |
| `className`           | `string`                               |              | Extra class on the root element. Useful for scoping theme overrides.                               |
| `style`               | `CSSProperties`                        |              | Inline styles on the root element.                                                                 |
| `labels`              | `Partial<LightboxLabels>`              |              | Override button labels / tooltips for localisation. See `defaultLabels`.                           |

## Keyboard shortcuts

| Key                            | Action                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| <kbd>←</kbd> <kbd>→</kbd>      | Previous / next image, or pan when zoomed in                  |
| <kbd>↑</kbd> <kbd>↓</kbd>      | Pan when zoomed in                                            |
| <kbd>+</kbd> <kbd>=</kbd> <kbd>-</kbd> | Zoom in / out                                         |
| <kbd>0</kbd>                   | Reset zoom, pan and rotation                                  |
| <kbd>r</kbd> / <kbd>Shift</kbd>+<kbd>r</kbd> | Rotate right / left                             |
| <kbd>Esc</kbd>                 | Reset if the image is transformed, otherwise close            |
| <kbd>Tab</kbd>                 | Move between toolbar buttons (focus stays inside the dialog)  |

## Touch and mouse

- Drag to pan when zoomed in. Swipe left / right to change image.
- Pinch to zoom. Double tap to zoom in to `doubleClickZoom`, double tap again to reset.
- Mouse wheel or trackpad to zoom around the cursor. Double click to zoom.
- Click the backdrop to close (when not zoomed in).

## Theming

Everything is driven by CSS custom properties set on `.lb-root`. Override them globally or on your own class passed
through `className`:

```css
.my-lightbox {
  --lb-backdrop: rgb(255 255 255 / 0.92);
  --lb-toolbar-bg: rgb(255 255 255 / 0.85);
  --lb-fg: #16181d;
  --lb-accent: #0b6bcb;
}
```

```jsx
<Lightbox className="my-lightbox" images={images} onClose={close} />
```

| Variable               | Default                      | What it controls                         |
| ---------------------- | ---------------------------- | ---------------------------------------- |
| `--lb-z-index`         | `50000`                      | Stacking order of the overlay            |
| `--lb-backdrop`        | `rgb(0 0 0 / 0.85)`          | Backdrop colour                          |
| `--lb-toolbar-bg`      | `rgb(0 0 0 / 0.6)`           | Toolbar background                       |
| `--lb-toolbar-height`  | `52px`                       | Toolbar height                           |
| `--lb-fg`              | `#fff`                       | Icon and text colour                     |
| `--lb-fg-muted`        | `rgb(255 255 255 / 0.6)`     | Counter and error text                   |
| `--lb-button-hover`    | `rgb(255 255 255 / 0.15)`    | Button hover background                  |
| `--lb-button-active`   | `rgb(255 255 255 / 0.28)`    | Button pressed background                |
| `--lb-accent`          | `#fff`                       | Focus ring and spinner colour            |
| `--lb-font`            | system font stack            | Toolbar font                             |
| `--lb-duration`        | `160ms`                      | Transition and fade duration             |

Every element also carries a stable `lb-` prefixed class (`.lb-toolbar`, `.lb-button--close`, `.lb-nav--next`,
`.lb-img`, …) if you need to go further.

## TypeScript

```ts
import Lightbox, { type LightboxProps, type LightboxImage } from "react-awesome-lightbox";
```

## Migrating from 1.x

- Upgrade to React 18 or 19. `react-dom` is now a peer dependency.
- The stylesheet is now at `react-awesome-lightbox/style.css`. The old `build/style.css` path still works.
- CSS class names changed and are all prefixed with `lb-`. Custom CSS written against 1.x needs updating.
  Most customisations are now a couple of CSS variables, see Theming above.
- The lightbox renders in a portal by default. Pass `portal={false}` to render inline as before.
- Zoom is capped at `maxZoom` (default 10). Raise it if you relied on unlimited zoom.
- Everything else, including every 1.x prop, works as before. See [CHANGELOG.md](CHANGELOG.md) for the full list.

## Development

```sh
npm install
npm run demo        # playground at http://localhost:5173 using the local source
npm test            # vitest
npm run build       # dist/
```

Releases: bump the version in `package.json`, push, then publish a GitHub release tagged `vX.Y.Z`. The publish
workflow builds, tests and publishes to npm with provenance via trusted publishing.

## License

MIT © [Anam Ahmed](https://github.com/theanam). Contributions are welcome 🖤
