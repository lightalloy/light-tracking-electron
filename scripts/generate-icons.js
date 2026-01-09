import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import zlib from 'zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Simple PNG generator for solid color circles
// PNG format: http://www.libpng.org/pub/png/spec/1.2/PNG-Structure.html

function createPNG(size, r, g, b, a = 255) {
  const width = size
  const height = size
  
  // Create raw RGBA data for a circle
  const rawData = []
  const center = size / 2
  const radius = size / 2 - 1
  
  for (let y = 0; y < height; y++) {
    rawData.push(0) // Filter byte for each scanline
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - center + 0.5) ** 2 + (y - center + 0.5) ** 2)
      if (dist <= radius) {
        // Inside circle
        rawData.push(r, g, b, a)
      } else if (dist <= radius + 1) {
        // Anti-aliasing edge
        const alpha = Math.round(a * (radius + 1 - dist))
        rawData.push(r, g, b, alpha)
      } else {
        // Outside - transparent
        rawData.push(0, 0, 0, 0)
      }
    }
  }

  const rawBuffer = Buffer.from(rawData)
  
  // Compress using zlib
  const compressed = zlib.deflateSync(rawBuffer, { level: 9 })
  
  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData.writeUInt8(8, 8)   // bit depth
  ihdrData.writeUInt8(6, 9)   // color type (RGBA)
  ihdrData.writeUInt8(0, 10)  // compression
  ihdrData.writeUInt8(0, 11)  // filter
  ihdrData.writeUInt8(0, 12)  // interlace
  const ihdr = createChunk('IHDR', ihdrData)
  
  // IDAT chunk
  const idat = createChunk('IDAT', compressed)
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0))
  
  return Buffer.concat([signature, ihdr, idat, iend])
}

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = crc32(crcData)
  
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc >>> 0, 0)
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

// CRC32 implementation
function crc32(buffer) {
  let crc = 0xffffffff
  const table = getCRC32Table()
  
  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  
  return crc ^ 0xffffffff
}

let crcTable = null
function getCRC32Table() {
  if (crcTable) return crcTable
  
  crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    crcTable[n] = c
  }
  return crcTable
}

// Create assets directory
const assetsDir = path.join(__dirname, '..', 'assets')
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
}

// Generate icons
const size = 22  // Good size for Linux system tray

// Green circle (active)
const greenIcon = createPNG(size, 34, 197, 94)  // #22c55e
fs.writeFileSync(path.join(assetsDir, 'icon-active.png'), greenIcon)
console.log('Created icon-active.png')

// White circle (inactive)  
const whiteIcon = createPNG(size, 229, 229, 229)  // #e5e5e5
fs.writeFileSync(path.join(assetsDir, 'icon-inactive.png'), whiteIcon)
console.log('Created icon-inactive.png')

// App icon (larger, for window)
const appIcon = createPNG(256, 132, 204, 22)  // lime #84cc16
fs.writeFileSync(path.join(assetsDir, 'icon.png'), appIcon)
console.log('Created icon.png')

console.log('All icons generated successfully!')

