/* eslint-disable @typescript-eslint/no-require-imports */
// Resizes muscle PNG assets in public/muscle/ to a max width of 600px.
// Preserves aspect ratio and keeps alpha channel intact.

const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const DIR = path.join(__dirname, "..", "public", "muscle")
const TARGET_WIDTH = 600

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".png"))
  for (const file of files) {
    const fullPath = path.join(DIR, file)
    const before = fs.statSync(fullPath).size

    const buffer = await sharp(fullPath)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer()

    fs.writeFileSync(fullPath, buffer)

    const after = fs.statSync(fullPath).size
    const saved = (((before - after) / before) * 100).toFixed(1)
    console.log(`${file.padEnd(34)}  ${(before / 1024).toFixed(0).padStart(5)}KB -> ${(after / 1024).toFixed(0).padStart(5)}KB  (-${saved}%)`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
