import type { lottie2imgInitOptions } from "./types";

const defalutOptions: Required<lottie2imgInitOptions> = {
  core: "./core/mult-thread.js",
  multThread: true,
  log: false,
  logger: (level, msg) => {
    if (level === "error") console.error("[lottie2img]", msg);
    else console.log("[lottie2img]", msg);
  },
};
export default defalutOptions;
