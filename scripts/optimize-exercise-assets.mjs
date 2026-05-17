import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const exerciseDir = path.join(root, "public", "assets", "exercises");
const maxWidth = 720;
const quality = 72;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return fullPath;
  }));

  return files.flat();
}

function isSourceImage(filePath) {
  return /\.(png|jpe?g)$/i.test(filePath);
}

function outputPathFor(filePath) {
  return filePath.replace(/\.(png|jpe?g)$/i, ".webp");
}

async function optimize(filePath) {
  const outputPath = outputPathFor(filePath);
  const sourceStat = await fs.stat(filePath);

  try {
    const existingStat = await fs.stat(outputPath);
    if (existingStat.mtimeMs >= sourceStat.mtimeMs) {
      return { skipped: true, input: sourceStat.size, output: existingStat.size };
    }
  } catch {}

  const image = sharp(filePath, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const shouldResize = metadata.width && metadata.width > maxWidth;

  let pipeline = image;
  if (shouldResize) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }

  await pipeline.webp({ quality, effort: 5 }).toFile(outputPath);
  const outputStat = await fs.stat(outputPath);

  return { skipped: false, input: sourceStat.size, output: outputStat.size };
}

const files = (await walk(exerciseDir)).filter(isSourceImage);
let converted = 0;
let skipped = 0;
let inputBytes = 0;
let outputBytes = 0;

for (const file of files) {
  const result = await optimize(file);
  inputBytes += result.input;
  outputBytes += result.output;
  if (result.skipped) skipped += 1;
  else converted += 1;
}

const mb = (value) => `${(value / 1024 / 1024).toFixed(2)} MB`;

console.log(`Exercise assets optimized: ${converted} converted, ${skipped} already current`);
console.log(`PNG/JPG source size: ${mb(inputBytes)}`);
console.log(`WebP output size: ${mb(outputBytes)}`);
