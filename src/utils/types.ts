type lottie2imgLogger = (level: "info" | "error", message: string) => void;

interface lottie2imgCore extends EmscriptenModule {
  ccall: typeof ccall;
  exit(code: number): void;
  AsciiToString(ptr: number): string;
  getValue: typeof getValue;
  setValue: typeof setValue;
}

interface lottie2imgInitOptions {
  core?: string;
  multThread?: boolean;
  log?: boolean;
  logger?: lottie2imgLogger;
}

interface lottie2imgOptions {
  format?: "webp" | "gif";
  frameRate?: number;
  height?: number;
  width?: number;
  loop?: number;
  backgroundColor?: number;
  minimizeSize?: boolean;
  quality?: number;
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
