#!/usr/bin/env node
import { access, readFile, writeFile } from "fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Lottie2img from "@lottie2img/main";
import type { PathLike } from "node:fs";

type convertOptions = Array<[PathLike, PathLike, lottie2imgOptions]>;
type lottie2imgOptions = NonNullable<Parameters<Lottie2img["convert"]>[1]>;
type lottie2imgOutputFormats = lottie2imgOptions["format"];

const currentDir = dirname(fileURLToPath(import.meta.url));
const resourceDir = join(currentDir, "..", "..", "resource");
const outputDir = join(currentDir, "..", "output");
const exampleFiles: convertOptions = [
  [
    join(resourceDir, "cherry.tgs"),
    join(outputDir, "cherry.gif"),
    { format: Lottie2img.format.GIF },
  ],
  [join(resourceDir, "duck.tgs"), join(outputDir, "duck.webp"), {}],
  [join(resourceDir, "confetti.json"), join(outputDir, "confetti.webp"), {}],
  [
    join(resourceDir, "gradient.json"),
    join(outputDir, "gradient.webp"),
    { width: 1280, height: 720 },
  ],
];

// parse arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("No argument specified, using sample resources!");
  await convert(exampleFiles);
  console.log(`Results have been saved to ${outputDir}.`);
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
        ...parseOptions(fileArgs),
      },
    ]);
    inputPos = nextInputPos;
  } while (inputPos !== -1);
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
  console.log("  --format [webp|gif]            output format");
  console.log("  --frame-rate [int]         frames per second");
  console.log("  --height [int]             height of output image");
  console.log("  --width [int]              width of output image");
  console.log(
    "  --loop [int]               number of times to repeat the animation (0 = infinite)"
  );
  console.log(
    "  --background-color [RGBA]  background color with alpha in RGBA format(e.g. 0xffffff)"
  );
  console.log(
    "  --minimize-size [boo]      sacrifice time for the smallest possible output"
  );
  console.log(
    "  --quality [double(0-100)]  output quality (0 gives the smallest size and 100 the largest)"
  );
  console.log(
    "  --level [int(0~6)]         quality/speed trade-off (0=fast, 6=slower-better)"
  );
}

/**
 * Print lottie2img version
 */
async function printVersion(): Promise<void> {
  const lottie2img = await Lottie2img.create();
  console.log("Lottie2WebP example CLI");
  console.log("Type help for help");
  console.log(JSON.stringify(lottie2img.version, null, 2));
  lottie2img.destroy();
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
  await Promise.all(
    fileList.map(async ([input, output, options]) => {
      console.log("Reading input file %s.", input);
      const inputData = await readFile(input);
      console.log("Start converting...");
      const result = await lottie2img.convert(inputData, options);
      console.log("Writting result to %s.", output);
      await writeFile(output, result);
      console.log("Done.");
    })
  );
  lottie2img.destroy();
}

function parseValue(value: string): number | boolean | string {
  return !Number.isNaN(Number(value))
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
  const ignoreFields = ["-i", "-o"];

  const options: lottie2imgOptions = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg.startsWith("--") && validFields.includes(arg.slice(2))) {
      const valueStr = args[++i];
      if (!valueStr) {
        console.error(`Missing value for option ${arg}`);
        process.exit(1);
      }
      const key = arg
        .slice(2)
        .replace(/-([a-z])/gi, (m) => m.substring(1).toUpperCase());
      let value;
      if (key == "format" && typeof valueStr === "string") {
        const format = (
          Lottie2img.format as unknown as Record<
            string,
            lottie2imgOutputFormats
          >
        )[valueStr.toUpperCase()];
        if (format === undefined)
          throw new Error(`Unsupport output format :${valueStr}`);
        options.format = format;
      } else {
        value = parseValue(valueStr);
        Object.assign(options, {
          [key]: value,
        });
      }
    } else if (ignoreFields.includes(arg)) {
      ++i;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return options;
}
