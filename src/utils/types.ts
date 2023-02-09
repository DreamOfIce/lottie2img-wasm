type lottie2imgLogger = (level: "info" | "error", message: string) => void;

interface lottie2imgCore extends EmscriptenModule {
  ccall: typeof ccall;
  cwrap: typeof cwrap;
  exit(code: number): void;
  addFunction: typeof addFunction;
  AsciiToString(ptr: number): string;
  getValue: typeof getValue;
  setValue: typeof setValue;
  haveAsync: boolean;
  outputFormat: lottie2imgOutputFormats;
}

interface lottie2imgInitOptions {
  core?: string;
  log?: boolean;
  logger?: lottie2imgLogger;
}

enum lottie2imgOutputFormats {
  WEBP,
  // GIF,
}

interface lottie2imgOptions {
  /**
   * output format, currently only webp is supported
   */
  format?: lottie2imgOutputFormats;
  /**
   * frames per second, ignored when exceeding the frame rate of the lottie file, leave blank to use the value of the lottie
   */
  frameRate?: number;
  /**
   * height of output image, leave blank to use lottie's default height
   */
  height?: number;
  /**
   * width of output image, leave blank to use lottie's default height
   */
  width?: number;
  /**
   * number of times to repeat the animation (0 = infinite)
   * @default 0
   */
  loop?: number;
  /**
   * background color with alpha in RGBA format
   * @default 0
   */
  backgroundColor?: number;
  /**
   * very slow! Sacrifice time for the smallest possible output
   * @default false
   */
  minimizeSize?: boolean;
  /**
   * between 0 and 100 (0 gives the smallest size and 100 the largest)
   * @default 75
   */
  quality?: number;
  /**
   * between 0 and 6. quality/speed trade-off (0=fast, 6=slower-better)
   * @default 4
   */
  level?: number;
}

interface lottie2imgVersion {
  emscripten: string;
  lottie2img: string;
  lottie2imgCore: string;
  libwebp: string;
  rlottie: string;
  zlib: string;
}

export type {
  lottie2imgCore,
  lottie2imgLogger,
  lottie2imgInitOptions,
  lottie2imgOptions,
  lottie2imgVersion,
};
export { lottie2imgOutputFormats };
