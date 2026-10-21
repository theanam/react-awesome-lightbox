import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", style: "src/style.css" },
  format: ["esm", "cjs"],
  dts: { entry: { index: "src/index.ts" } },
  target: "es2020",
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
