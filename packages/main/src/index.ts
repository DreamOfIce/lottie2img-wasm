import { version } from "../../../package.json";
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
    this.#haveAsync = this.#core.haveAsync;
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
      ...JSON.parse(this.#core.UTF8ToString(versionPtr)),
    } as lottie2imgVersion;
  }

  #core: lottie2imgCore;
  #destroyed = false;
  static format = lottie2imgOutputFormats;
  #haveAsync: boolean;
  #logger: lottie2imgLogger;
  #taskList: Map<symbol, [(value: number) => void, (reason: string) => void]> =
    new Map();
  version: lottie2imgVersion;

  #callback(handle: symbol, errorPtrPtr: number, result: number): void {
    const errorPtr = this.#core.getValue(errorPtrPtr, "i32");
    this.#core._free(errorPtrPtr);
    let message = "";
    if (errorPtr) {
      message = this.#core.UTF8ToString(errorPtr);
      this.#core._free(errorPtr);
    }
    const task = this.#taskList.get(handle);
    this.#taskList.delete(handle);
    if (!task) throw new Error(`Handle ${handle.toString()} does not exisit!`);
    const [resolve, reject] = task;
    if (result === 0) {
      reject(`Convert failed: ${message}`);
    }
    resolve(result);
  }

  #callConvert: (
    args: string,
    inputPointer: number,
    inputLength: number,
    outputLengthPointer: number,
    errorPointersPointer: number
  ) => number;

  #callConvertAsync: (
    args: string,
    inputPointer: number,
    inputLength: number,
    outputLengthPointer: number,
    callbackPointer: number,
    errorPointersPointer: number
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
      print: () => {
        // do nothing
      },
      printErr: () => {
        // do nothing
      },
    };
    if (options.log) {
      Object.assign(coreOptions, {
        print: (message: string) => options.logger("info", message),
        printErr: (message: string) =>
          message.startsWith("[warn]")
            ? options.logger("warn", message.slice(6))
            : options.logger("error", message),
      });
    }
    const { default: createCore } = (await import(options.core)) as {
      default: (options: Partial<EmscriptenModule>) => Promise<lottie2imgCore>;
    };
    return new Lottie2img(await createCore(coreOptions), options);
  }

  /**
   * Convert options to string
   * @param options lottie2img options
   * @returns string in key=value format, split with ';'
   */
  static #optionToString = (options: lottie2imgOptions): string =>
    Object.entries(options)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value as string}`)
      .join(";");

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
    } else if (!this.#haveAsync) {
      this.#logger(
        "warn",
        "This core does not support async convert,  run sync version instead"
      );
      return this.convertSync(input, options);
    }
    const handle = Symbol("lottie2img convert task");
    let errorPtr: number | undefined,
      inputPtr: number | undefined,
      outputPtr: number | undefined,
      outputLengthPtr: number | undefined,
      callbackPtr: number | undefined;
    try {
      const inputLength = input.length * input.BYTES_PER_ELEMENT;
      inputPtr = this.#core._malloc(inputLength);
      errorPtr = this.#core._malloc(4); // char **
      outputLengthPtr = this.#core._malloc(4); // size_t *
      this.#core.HEAPU8.set(input, inputPtr);
      const optstr = Lottie2img.#optionToString(options);
      callbackPtr = this.#core.addFunction(
        this.#callback.bind(this, handle, errorPtr),
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
            callbackPtr as number,
            errorPtr as number
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
      if (errorPtr) this.#core._free(errorPtr);
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
      let errorPtr, inputPtr, outputPtr, outputLengthPtr;
      try {
        const inputLength = input.length * input.BYTES_PER_ELEMENT;
        inputPtr = this.#core._malloc(inputLength);
        errorPtr = this.#core._malloc(4); // char **
        outputLengthPtr = this.#core._malloc(4); // size_t *
        this.#core.HEAPU8.set(input, inputPtr);
        const optstr = Lottie2img.#optionToString(options);
        outputPtr = this.#callConvert(
          optstr,
          inputPtr,
          inputLength,
          outputLengthPtr,
          errorPtr
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
        if (errorPtr) this.#core._free(errorPtr);
      }
    } else {
      throw new Error("Cannot be called after destroy!");
    }
  }

  /**
   * Destroy wasm instances and free memory
   */
  destroy(): void {
    this.#taskList.forEach(([, reject]) => {
      reject("The core has been destroyed!");
    });
    this.#core.exit(0);
    this.#destroyed = true;
  }
}

export default Lottie2img;
