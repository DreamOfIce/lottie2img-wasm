import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["node/cli.mts"],
  external: [/dist\/.+/],
  format: ["esm"],
});
