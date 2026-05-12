/**
 * PWA アイコン生成スクリプト（純粋 Node.js / 依存パッケージなし）
 * 実行: node scripts/generate-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// CRC32 テーブル生成
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  CRC_TABLE[i] = c
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (~crc) >>> 0
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function generatePNG(size) {
  const bg = [26, 26, 26]  // #1a1a1a

  const circles = [
    { x: size * 0.38, y: size * 0.35, r: size * 0.18, color: [255, 107, 107] }, // #FF6B6B
    { x: size * 0.62, y: size * 0.35, r: size * 0.18, color: [78, 205, 196] },  // #4ECDC4
    { x: size * 0.50, y: size * 0.58, r: size * 0.18, color: [69, 183, 209] },  // #45B7D1
  ]

  // スキャンライン生成（filter byte 0 + RGB × size）
  const scanlines = []
  for (let y = 0; y < size; y++) {
    const line = Buffer.alloc(1 + size * 3)
    line[0] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      let [r, g, b] = bg
      for (const c of circles) {
        const dx = x - c.x, dy = y - c.y
        if (dx * dx + dy * dy <= c.r * c.r) {
          ;[r, g, b] = c.color
        }
      }
      line[1 + x * 3]     = r
      line[1 + x * 3 + 1] = g
      line[1 + x * 3 + 2] = b
    }
    scanlines.push(line)
  }

  const imageData = Buffer.concat(scanlines)
  const compressed = deflateSync(imageData)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0) // width
  ihdr.writeUInt32BE(size, 4) // height
  ihdr[8]  = 8  // bit depth
  ihdr[9]  = 2  // color type: RGB
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const publicDir = resolve(__dirname, '../public')
mkdirSync(publicDir, { recursive: true })

writeFileSync(resolve(publicDir, 'icon-192.png'), generatePNG(192))
writeFileSync(resolve(publicDir, 'icon-512.png'), generatePNG(512))

console.log('✓ icon-192.png generated')
console.log('✓ icon-512.png generated')
