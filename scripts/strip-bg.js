/* eslint-disable @typescript-eslint/no-require-imports */
// Strips near-white backgrounds from PNGs in public/muscle/ in place.
// Anti-aliased edges get a linear alpha fade so outlines stay clean.

const fs = require("fs")
const path = require("path")
const { PNG } = require("pngjs")

const DIR = path.join(__dirname, "..", "public", "muscle")

// Hard threshold: minChannel >= 245 → fully transparent.
// Soft band: minChannel 230..245 → linear alpha ramp (smooths anti-aliasing).
// Below 230 → keep original alpha (real body content).
function newAlpha(r, g, b, a) {
  const m = Math.min(r, g, b)
  if (m >= 245) return 0
  if (m >= 230) return Math.round(a * (245 - m) / 15)
  return a
}

const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".png"))
if (files.length === 0) {
  console.log("No PNG files found in", DIR)
  process.exit(0)
}

for (const file of files) {
  const fullPath = path.join(DIR, file)
  const png = PNG.sync.read(fs.readFileSync(fullPath))

  let stripped = 0
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i]
    const g = png.data[i + 1]
    const b = png.data[i + 2]
    const a = png.data[i + 3]
    const next = newAlpha(r, g, b, a)
    if (next !== a) stripped++
    png.data[i + 3] = next
  }

  fs.writeFileSync(fullPath, PNG.sync.write(png))
  const pct = ((stripped / (png.data.length / 4)) * 100).toFixed(1)
  console.log(`stripped ${file} (${pct}% pixels alpha-modified)`)
}
