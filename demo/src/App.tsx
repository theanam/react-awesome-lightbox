import { useState } from "react";
import Lightbox, { type ButtonAlign, type LightboxImage } from "react-awesome-lightbox";
import "react-awesome-lightbox/style.css";

const images: LightboxImage[] = [
  { url: "https://picsum.photos/id/1015/1600/1000", title: "River valley" },
  { url: "https://picsum.photos/id/1016/1600/1000", title: "Canyon" },
  { url: "https://picsum.photos/id/1018/1000/1600", title: "Mountain lake (portrait)" },
  { url: "https://picsum.photos/id/1025/1600/1000", title: "Pug" },
  { url: "https://picsum.photos/id/1039/2400/800", title: "Waterfall (very wide)" },
  { url: "https://picsum.photos/id/1043/1600/1000", title: "Forest road" },
];

interface Options {
  allowZoom: boolean;
  allowRotate: boolean;
  allowReset: boolean;
  showTitle: boolean;
  showCounter: boolean;
  loop: boolean;
  clickOutsideToExit: boolean;
  keyboardInteraction: boolean;
  wheelZoom: boolean;
  pinchZoom: boolean;
  buttonAlign: ButtonAlign;
  doubleClickZoom: number;
  zoomStep: number;
  theme: "dark" | "light" | "amber";
}

const defaults: Options = {
  allowZoom: true,
  allowRotate: true,
  allowReset: true,
  showTitle: true,
  showCounter: true,
  loop: true,
  clickOutsideToExit: true,
  keyboardInteraction: true,
  wheelZoom: true,
  pinchZoom: true,
  buttonAlign: "flex-end",
  doubleClickZoom: 4,
  zoomStep: 0.3,
  theme: "dark",
};

const booleanOptions: Array<[keyof Options, string]> = [
  ["allowZoom", "allowZoom"],
  ["allowRotate", "allowRotate"],
  ["allowReset", "allowReset"],
  ["showTitle", "showTitle"],
  ["showCounter", "showCounter"],
  ["loop", "loop"],
  ["clickOutsideToExit", "clickOutsideToExit"],
  ["keyboardInteraction", "keyboardInteraction"],
  ["wheelZoom", "wheelZoom"],
  ["pinchZoom", "pinchZoom"],
];

function codeFor(o: Options, index: number | null) {
  const props: string[] = [];
  for (const [key] of booleanOptions) if (o[key] !== defaults[key]) props.push(`${key}={${String(o[key])}}`);
  if (o.buttonAlign !== defaults.buttonAlign) props.push(`buttonAlign="${o.buttonAlign}"`);
  if (o.doubleClickZoom !== defaults.doubleClickZoom) props.push(`doubleClickZoom={${o.doubleClickZoom}}`);
  if (o.zoomStep !== defaults.zoomStep) props.push(`zoomStep={${o.zoomStep}}`);
  if (o.theme !== "dark") props.push(`className="theme-${o.theme}"`);
  if (index) props.push(`startIndex={${index}}`);
  const extra = props.length ? "\n  " + props.join("\n  ") : "";
  return `import Lightbox from "react-awesome-lightbox";
import "react-awesome-lightbox/style.css";

{open && (
  <Lightbox
    images={images}${extra.replace(/\n/g, "\n  ")}
    onClose={() => setOpen(false)}
  />
)}`;
}

export function App() {
  const [index, setIndex] = useState<number | null>(null);
  const [single, setSingle] = useState(false);
  const [options, setOptions] = useState<Options>(defaults);
  const set = <K extends keyof Options>(key: K, value: Options[K]) => setOptions((o) => ({ ...o, [key]: value }));

  const { theme, ...lightboxProps } = options;
  const className = theme === "dark" ? undefined : `theme-${theme}`;

  return (
    <main className="page">
      <header className="hero">
        <h1>react-awesome-lightbox</h1>
        <p>
          Lightweight, accessible lightbox image viewer for React. Zoom, pan, rotate, pinch, swipe and full keyboard
          support. No dependencies besides React.
        </p>
        <p className="links">
          <a href="https://github.com/theanam/react-awesome-lightbox">GitHub</a>
          <a href="https://www.npmjs.com/package/react-awesome-lightbox">npm</a>
          <code>npm install react-awesome-lightbox</code>
        </p>
      </header>

      <section>
        <h2>Gallery (multi image mode)</h2>
        <p className="hint">Click a thumbnail. Try the mouse wheel, double click, drag, arrow keys, +/-, r, Esc.</p>
        <div className="grid">
          {images.map((img, i) => (
            <button key={img.url} className="thumb" onClick={() => setIndex(i)} aria-label={`Open ${img.title}`}>
              <img src={img.url.replace(/\/\d+\/\d+$/, "/480/320")} alt="" loading="lazy" />
              <span>{img.title}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Single image mode</h2>
        <button className="button" onClick={() => setSingle(true)}>
          Open single image
        </button>
      </section>

      <section className="options">
        <h2>Options</h2>
        <div className="option-grid">
          {booleanOptions.map(([key, label]) => (
            <label key={key}>
              <input type="checkbox" checked={options[key] as boolean} onChange={(e) => set(key, e.target.checked)} />
              {label}
            </label>
          ))}
          <label>
            buttonAlign
            <select value={options.buttonAlign} onChange={(e) => set("buttonAlign", e.target.value as ButtonAlign)}>
              <option value="flex-end">flex-end</option>
              <option value="flex-start">flex-start</option>
              <option value="center">center</option>
            </select>
          </label>
          <label>
            doubleClickZoom
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={options.doubleClickZoom}
              onChange={(e) => set("doubleClickZoom", Number(e.target.value))}
            />
          </label>
          <label>
            zoomStep
            <input
              type="number"
              min={0.1}
              max={2}
              step={0.1}
              value={options.zoomStep}
              onChange={(e) => set("zoomStep", Number(e.target.value))}
            />
          </label>
          <label>
            theme (CSS variables)
            <select value={options.theme} onChange={(e) => set("theme", e.target.value as Options["theme"])}>
              <option value="dark">dark (default)</option>
              <option value="light">light</option>
              <option value="amber">amber</option>
            </select>
          </label>
        </div>
        <pre>
          <code>{codeFor(options, index)}</code>
        </pre>
      </section>

      {index !== null && (
        <Lightbox
          {...lightboxProps}
          className={className}
          images={images}
          startIndex={index}
          onClose={() => setIndex(null)}
          onNavigateImage={(i) => setIndex(i)}
        />
      )}
      {single && (
        <Lightbox
          {...lightboxProps}
          className={className}
          image="https://picsum.photos/id/1035/1600/1000"
          title="A single image"
          onClose={() => setSingle(false)}
        />
      )}
    </main>
  );
}
