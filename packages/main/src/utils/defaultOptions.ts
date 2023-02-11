import type { lottie2imgInitOptions } from "./types";

const defalutOptions: Required<lottie2imgInitOptions> = {
  core: "@lottie2img/core-mt",
  log: false,
  logger: (level, msg) => {
    switch (level) {
      case "error":
        console.error("[lottie2img]", msg);
        break;
      case "warn":
        console.warn("[lottie2img] [warn]", msg);
        break;
      default:
        console.log("[lottie2img]", msg);
        break;
    }
  },
};

export default defalutOptions;
