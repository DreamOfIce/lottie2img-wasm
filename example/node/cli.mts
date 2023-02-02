import { access, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Lottie2img from "../../dist/index.mjs";
import type { PathLike } from "fs";
import type { lottie2imgOptions } from "../../src/utils/types.js";

type convertOptions = Array<[PathLike, PathLike, lottie2imgOptions]>;
const currentDir = dirname(fileURLToPath(import.meta.url));
const resourceDir = join(currentDir, "..", "..", "resource");
const outputDir = join(currentDir, "..", "output");
const defaultFiles: convertOptions = [
  [join(resourceDir, "cherry.tgs"), join(outputDir, "cherry.webp"), {}],
  [join(resourceDir, "duck.tgs"), join(outputDir, "duck.webp"), {}],
  [join(resourceDir, "confetti.json"), join(outputDir, "confetti.webp"), {}],
  [join(resourceDir, "gradient.json"), join(outputDir, "gradient.webp"), {}],
];

// parse arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("No argument specified, using sample resources!");
  await convert(defaultFiles);
} else if (args.includes("-v") || args.includes("--version")) {
  await printVersion();
} else if (args.includes("-h") || args.includes("--help")) {
  printHelp();
} else {
  let inputPos = args.indexOf("-i");
  if (inputPos === -1) {
    console.error("No input file specified");
    process.exit(1);
  }
  const globalOptions = parseOptions(args.slice(0, inputPos));
  const files: convertOptions = [];
  do {
    const nextInputPos = args.indexOf("-i", inputPos + 1);
    const fileArgs = args.slice(
      inputPos,
      nextInputPos === -1 ? args.length : nextInputPos
    );

    const inputPath = fileArgs[1] as string;
    try {
      await access(inputPath);
    } catch (err) {
      if (err instanceof Error)
        console.error(`Failed to open input file ${inputPath}: ${err.message}`);
    }
    const outputPos = fileArgs.indexOf("-o");
    const outputPath = fileArgs[outputPos + 1] as string;
    if (outputPos === -1 || !outputPath) {
      console.error(`No output file specified for input ${inputPath}`);
      process.exit(1);
    }
    files.push([
      inputPath,
      outputPath,
      {
        ...globalOptions,
        ...parseOptions(
          fileArgs
            .filter((_v, i) => i !== outputPos && i !== outputPos + 1)
            .slice(2) // remove -i and -o from arguments
        ),
      },
    ]);
    inputPos = nextInputPos;
  } while (inputPos !== -1);
  console.log(files);
  await convert(files);
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(
    "Usage: lottie2img [global-options] -i input-filename -o output-filename [options] [-i input-filename -o output-filename [file-options]]..."
  );
  console.log("Running without arguments to use example files");

  console.log("Commands:");
  console.log("  -h  --help       show this infomation and exit.");
  console.log("  -v  --version    print version in and exit.");

  console.log("Convert options:");
}

/**
 * Print lottie2img version
 */
async function printVersion(): Promise<void> {
  const lottie2img = await Lottie2img.create();
  console.log("Lottie2WebP example CLI");
  console.log("Type help for help");
  console.log(JSON.stringify(lottie2img.version, null, 2));
  lottie2img.destory();
}

/**
 * Read multiple lottie/tgs files and convert to dynamic webp for writing to disk
 * @param {Array<[PathLike, PathLike]>} fileList list of paths to input and output files
 * @returns Promise<void>
 */
async function convert(fileList: convertOptions): Promise<void> {
  const lottie2img = await Lottie2img.create({
    log: true,
  });
  for (const [input, output, options] of fileList) {
    console.log("Reading input file %s.", input);
    const inputData = await readFile(input);
    console.log("Start converting...");
    const result = lottie2img.convert(inputData, options);
    console.log("Writting result to %s.", output);
    await writeFile(output, result);
    console.log("Done.");
  }
  lottie2img.destory();
}

function parseValue(value: string): number | boolean | string {
  return Number.isNaN(Number(value))
    ? Number(value)
    : value === "true"
    ? true
    : value === "false"
    ? false
    : value;
}

function parseOptions(args: Array<string>): lottie2imgOptions {
  const validFields = [
    "format",
    "frame-rate",
    "height",
    "width",
    "loop",
    "background-color",
    "minimize-size",
    "quality",
    "level",
  ];
  const options: lottie2imgOptions = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg.startsWith("--") && validFields.includes(arg.slice(2))) {
      Object.assign(options, {
        [arg
          .slice(2)
          .replace(/-([a-z])/gi, (m) => m.substring(1).toUpperCase())]:
          parseValue(args[++i] ?? ""),
      });
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return options;
}
