import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// The demo imports the package by name but resolves it to the local source,
// so `npm run demo` is a live playground for the component.
export default defineConfig({
  plugins: [react()],
  base: process.env.DEMO_BASE ?? "/",
  resolve: {
    alias: [
      { find: "react-awesome-lightbox/style.css", replacement: fileURLToPath(new URL("../src/style.css", import.meta.url)) },
      { find: "react-awesome-lightbox", replacement: fileURLToPath(new URL("../src/index.ts", import.meta.url)) },
    ],
  },
});
