import { defineConfig } from "tsup";

export default defineConfig({
  entry: { lottie2img: "node/cli.mts" },
  format: ["esm"],
  target: "node16",
});
