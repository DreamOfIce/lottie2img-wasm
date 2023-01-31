import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Lottie2img from "../../dist/index.js";
import type { PathLike } from "fs";

const resourceDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "resource"
);
const outputDir = join(dirname(fileURLToPath(import.meta.url)), "..", "output");
const defaultFiles: Array<[PathLike, PathLike]> = [
  [join(resourceDir, "1.tgs"), join(outputDir, "1.webp")],
  [join(resourceDir, "2.tgs"), join(outputDir, "2.webp")],
];

// parse arguments
const args = process.argv.slice(2);
if (args.includes("-v") || args.includes("--version")) {
  await printVersion();
} else if (args.includes("-h") || args.includes("--help")) {
  printHelp();
} else {
  await convert(defaultFiles);
}
process.exit(0);

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
async function convert(fileList: Array<[PathLike, PathLike]>): Promise<void> {
  const lottie2img = await Lottie2img.create({ log: true });
  console.log("Version:", lottie2img.version);
  await Promise.all(
    fileList.map(async ([input, output]): Promise<void> => {
      console.log("Reading input file %s.", input);
      const inputData = await readFile(input);
      console.log("Start converting...");
      const result = lottie2img.convert(inputData);
      console.log("Writting result to %s.", output);
      await writeFile(output, result);
      console.log("Done.");
    })
  );
  lottie2img.destory();
}
