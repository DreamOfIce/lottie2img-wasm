import { version } from "../package.json";
import defaultOptions from "./utils/defaultOptions.js";
import type {
  lottie2imgCore,
  lottie2imgLogger,
  lottie2imgInitOptions,
  lottie2imgOptions,
  lottie2imgVersion,
} from "./utils/types.js";
import { lottie2imgOutputFormats } from "./utils/types.js";

class Lottie2img {
  /**
   * Don't use this constructor direct, use Lottie2img.create() instead!
   * @private
   * @see {@link create}
   */
  private constructor(
    core: lottie2imgCore,
    options: Required<lottie2imgInitOptions>
  ) {
    this.#core = core;
    this.#enableLog = options.log;
    this.#logger = options.logger;

    // init properties
    this.#callConvert = this.#core.cwrap("convert", "number", [
      "string",
      "number",
      "number",
      "number",
    ]);
    const versionPtr = this.#core.ccall("version", "number", [], []);
    this.version = {
      wrapper: version,
      ...JSON.parse(this.#core.AsciiToString(versionPtr)),
    } as lottie2imgVersion;
  }
  #core: lottie2imgCore;
  #callConvert: (
    args: string,
    inputPointer: number,
    inputLength: number,
    outputLengthPointer: number
  ) => number;
  #destoryed = false;
  #enableLog;
  #logger: lottie2imgLogger;
  version: lottie2imgVersion;
  static format = lottie2imgOutputFormats;

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
    if (options.log) {
      Object.assign(coreOptions, {
        print: (message: string) => options.logger("info", message),
        printErr: (message: string) => options.logger("error", message),
      });
    } else {
      Object.assign(coreOptions, {
        print: () => {
          // do nothing
        },
        printErr: () => {
          // do nothing
        },
      });
    }
    const { default: createCore } = (await import(options.core)) as {
      default: (options: Partial<EmscriptenModule>) => Promise<lottie2imgCore>;
    };
    return new Lottie2img(await createCore(coreOptions), options);
  }

  /**
   * Convert Lottie to an image. Note that you cannot call this function after calling distory()
   * @param input Uint8 Array containing lottie datas, support lottie and tgs(gziped) format
   * @param options convert options
   * @returns Uint8 Array containin the image
   */
  convert(input: Uint8Array, options: lottie2imgOptions = {}): Uint8Array {
    if (!this.#destoryed) {
      let inputPtr, outputPtr, outputLengthPtr;
      try {
        const inputLength = input.length * input.BYTES_PER_ELEMENT;
        inputPtr = this.#core._malloc(inputLength);
        outputLengthPtr = this.#core._malloc(4); // int
        this.#core.HEAPU8.set(input, inputPtr);
        const optstr = Object.entries(options)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `${key}=${value as string}`)
          .join(";");
        outputPtr = this.#callConvert(
          optstr,
          inputPtr,
          inputLength,
          outputLengthPtr
        );
        const outputLength = this.#core.getValue(outputLengthPtr, "i32");
        const result = new Uint8Array(
          this.#core.HEAPU8.subarray(outputPtr, outputPtr + outputLength)
        );
        return result;
      } catch (err) {
        if (err instanceof Error && this.#enableLog)
          this.#logger("error", err.message);
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
  /**
   * Destroy wasm instances and free memory
   */
  destory(): void {
    this.#core.exit(0);
    this.#destoryed = true;
  }
}

export default Lottie2img;
