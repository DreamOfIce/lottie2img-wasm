import { defineConfig } from "tsup";

export default defineConfig({
  dts: true,
  entry: ["src/index.ts"],
  external: [/\.\/core\/.*/],
  format: ["cjs", "esm"],
  minify: true,
});
