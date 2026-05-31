/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs")
const path = require("path")
const { PNG } = require("pngjs")

const file = process.argv[2] || "chest and tricep-front.png"
const fullPath = path.join(__dirname, "..", "public", "muscle", file)
const png = PNG.sync.read(fs.readFileSync(fullPath))

const buckets = { transparent: 0, white: 0, nearWhite: 0, body: 0 }
for (let i = 0; i < png.data.length; i += 4) {
  const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2], a = png.data[i + 3]
  if (a === 0) buckets.transparent++
  else if (r >= 250 && g >= 250 && b >= 250) buckets.white++
  else if (r >= 230 && g >= 230 && b >= 230) buckets.nearWhite++
  else buckets.body++
}
const total = png.data.length / 4
console.log(`File: ${file} (${png.width}x${png.height} = ${total} px)`)
for (const [k, v] of Object.entries(buckets)) {
  console.log(`  ${k.padEnd(12)} ${v.toString().padStart(8)}  ${((v / total) * 100).toFixed(2)}%`)
}

// Sample corners
const sampleAt = (x, y) => {
  const i = (y * png.width + x) * 4
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]]
}
console.log("Corners:")
console.log("  top-left:    ", sampleAt(2, 2))
console.log("  top-right:   ", sampleAt(png.width - 3, 2))
console.log("  bottom-left: ", sampleAt(2, png.height - 3))
console.log("  bottom-right:", sampleAt(png.width - 3, png.height - 3))
