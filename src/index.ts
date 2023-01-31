import { version } from "../package.json";
import defaultOptions from "./utils/defaultOptions.js";
import type {
  lottie2imgCore,
  lottie2imgLogger,
  lottie2imgInitOptions,
  lottie2imgVersion,
  lottie2imgOptions,
} from "./utils/types.js";

class Lottie2img {
  /**
   * @i
   */
  private constructor(
    core: lottie2imgCore,
    options: Required<lottie2imgInitOptions>
  ) {
    this.#core = core;
    this.#enableLog = options.log;
    this.#logger = options.logger;
    // apply logger
    Object.assign(this.#core, {
      print: (message: string) => {
        if (this.#enableLog) this.#logger("info", message);
      },
      printErr: (message: string) => {
        if (this.#enableLog) this.#logger("error", message);
      },
    });
    // get versions
    const versionPtr = this.#core.ccall("version", "number", [], []);
    this.version = {
      wrapper: version,
      ...JSON.parse(this.#core.AsciiToString(versionPtr)),
    } as lottie2imgVersion;
  }

  #core: lottie2imgCore;
  #destoryed = false;
  #enableLog: boolean;
  #logger: lottie2imgLogger;
  version: lottie2imgVersion;

  /**
   * Create a new Lottie2img instance
   * @param opt options
   * @returns a Lottie2img instance
   */
  static async create(opt: lottie2imgInitOptions = {}): Promise<Lottie2img> {
    const options = { ...defaultOptions, ...opt };
    const coreOptions = {
      noExitRuntime: true,
    };
    const { default: createCore } = (await import(options.core)) as {
      default: (options: Partial<EmscriptenModule>) => Promise<lottie2imgCore>;
    };
    return new Lottie2img(await createCore(coreOptions), options);
  }

  convert(input: Uint8Array, options: lottie2imgOptions = {}): Uint8Array {
    if (!this.#destoryed) {
      let inputPtr, outputPtr, outputLengthPtr;
      try {
        const inputLength = input.length * input.BYTES_PER_ELEMENT;
        inputPtr = this.#core._malloc(inputLength);
        outputLengthPtr = this.#core._malloc(4); // int
        this.#core.HEAPU8.set(input, inputPtr);
        const optstr = Object.entries(options)
          .map(([key, value]) => `${key}=${value as string}`)
          .join(";");
        outputPtr = this.#core.ccall(
          "convert",
          "number",
          ["string", "number", "number", "number"],
          [optstr, inputPtr, inputLength, outputLengthPtr]
        );
        const outputLength = this.#core.getValue(outputLengthPtr, "i32");
        const result = this.#core.HEAPU8.subarray(
          outputPtr,
          outputPtr + outputLength
        );
        return result;
      } catch (err) {
        if (err instanceof Error) this.#logger("error", err.message);
        throw err;
      } finally {
        // Ensure that requested memory is freed
        if (inputPtr) this.#core._free(inputPtr);
        if (outputPtr) this.#core._free(outputPtr);
        if (outputLengthPtr) this.#core._free(outputLengthPtr);
      }
    } else {
      throw new Error("Cannot be called after destory!");
    }
  }

  destory(): void {
    this.#core.exit(0);
    this.#destoryed = true;
  }

  setLogger(logger: lottie2imgLogger): void {
    this.#logger = logger;
  }
}

export default Lottie2img;
