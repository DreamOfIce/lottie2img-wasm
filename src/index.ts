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
    this.#hasAsync = this.#core.haveAsync;
    this.#logger = options.log
      ? options.logger
      : () => {
          // do nothing
        };

    // init properties
    this.#callConvert = this.#core.cwrap("convert", "number", [
      "string",
      "number",
      "number",
      "number",
    ]);
    this.#callConvertAsync = this.#core.cwrap("convertAsync", "boolean", [
      "string",
      "number",
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
  #destroyed = false;
  #taskList: Map<symbol, [(value: number) => void, (reason: string) => void]> =
    new Map();
  static format = lottie2imgOutputFormats;
  #callback(handle: symbol, ptr: number): void {
    const task = this.#taskList.get(handle);
    if (!task) throw new Error(`Handle ${handle.toString()} does not exisit!`);
    const [resolve, reject] = task;
    if (ptr === 0) {
      reject("Convert failed!");
    }
    resolve(ptr);
  }

  #core: lottie2imgCore;
  #hasAsync: boolean;
  #logger: lottie2imgLogger;
  version: lottie2imgVersion;
  #callConvert: (
    args: string,
    inputPointer: number,
    inputLength: number,
    outputLengthPointer: number
  ) => number;
  #callConvertAsync: (
    args: string,
    inputPointer: number,
    inputLength: number,
    outputLengthPointer: number,
    callbackPointer: number
  ) => boolean;

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
   * If the core supports multithread this operation is asynchronous, otherwise it is equivalent to calling convertAsync
   * @param input Uint8 Array containing lottie datas, support lottie and tgs(gziped) format
   * @param options convert options
   * @returns Promise returned a Uint8 Array containin the image
   */
  async convert(
    input: Uint8Array,
    options: lottie2imgOptions = {}
  ): Promise<Uint8Array> {
    if (this.#destroyed) {
      throw new Error("Cannot be called after destroy!");
    } else if (!this.#hasAsync) {
      this.#logger(
        "error",
        "[WARNING] This core does not support async convert,  run sync version instead"
      );
      return Promise.resolve(this.convertSync(input, options));
    }
    const handle = Symbol("lottie2img convert task");
    let inputPtr: number | undefined,
      outputPtr: number | undefined,
      outputLengthPtr: number | undefined,
      callbackPtr: number | undefined;
    try {
      const inputLength = input.length * input.BYTES_PER_ELEMENT;
      inputPtr = this.#core._malloc(inputLength);
      outputLengthPtr = this.#core._malloc(4); // size_t
      this.#core.HEAPU8.set(input, inputPtr);
      const optstr = Object.entries(options)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value as string}`)
        .join(";");
      callbackPtr = this.#core.addFunction(
        this.#callback.bind(this, handle),
        "vi"
      );
      const convertPromise = new Promise(
        (
          resolve: (value: number) => void,
          reject: (reason: string) => void
        ) => {
          this.#taskList.set(handle, [resolve, reject]);
          const result = this.#callConvertAsync(
            optstr,
            inputPtr as number,
            inputLength,
            outputLengthPtr as number,
            callbackPtr as number
          );
          if (!result)
            reject(
              "Unable to create task, check error log for more information"
            );
        }
      );
      outputPtr = await convertPromise;
      const outputLength = this.#core.getValue(outputLengthPtr, "i32");
      const result = new Uint8Array(
        this.#core.HEAPU8.subarray(outputPtr, outputPtr + outputLength)
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
  }

  /**
   * Synchronised version of convert()
   * @param input Uint8 Array containing lottie datas, support lottie and tgs(gziped) format
   * @param options convert options
   * @returns Promise returned a Uint8 Array containin the image
   */
  convertSync(input: Uint8Array, options: lottie2imgOptions = {}): Uint8Array {
    if (!this.#destroyed) {
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
        if (err instanceof Error) this.#logger("error", err.message);
        throw err;
      } finally {
        // Ensure that requested memory is freed
        if (inputPtr) this.#core._free(inputPtr);
        if (outputPtr) this.#core._free(outputPtr);
        if (outputLengthPtr) this.#core._free(outputLengthPtr);
      }
    } else {
      throw new Error("Cannot be called after destroy!");
    }
  }

  /**
   * Destroy wasm instances and free memory
   */
  destroy(): void {
    this.#core.exit(0);
    this.#destroyed = true;
  }
}

export default Lottie2img;
