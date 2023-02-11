import { defineConfig } from "tsup";

export default defineConfig({
  entry: { lottie2img: "node/cli.mts" },
  external: [/@lottie2img\/.+/],
  format: ["esm"],
  target: "node16",
});
