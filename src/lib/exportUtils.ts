import type { Color, Folder } from '@/types/database'

// ---- ダウンロードヘルパー ----

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---- SVG 生成 ----

export function generatePaletteSVG(
  colors: Color[],
  options: { format: 'HEX' | 'RGB' | 'HSL' | 'CMYK'; iconSize: 64 | 128 | 256 }
): string {
  const { iconSize, format } = options
  const rowHeight = iconSize + 32
  const width = 600
  const height = colors.length * rowHeight + 40

  function formatCode(c: Color): string {
    const r = parseInt(c.hex.slice(1, 3), 16)
    const g = parseInt(c.hex.slice(3, 5), 16)
    const b = parseInt(c.hex.slice(5, 7), 16)
    switch (format) {
      case 'RGB': return `rgb(${r}, ${g}, ${b})`
      case 'HSL': {
        const rn = r / 255, gn = g / 255, bn = b / 255
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
        const l = (max + min) / 2
        const d = max - min
        if (d === 0) return `hsl(0, 0%, ${Math.round(l * 100)}%)`
        const s = d / (1 - Math.abs(2 * l - 1))
        let h = 0
        if (max === rn) h = ((gn - bn) / d) % 6
        else if (max === gn) h = (bn - rn) / d + 2
        else h = (rn - gn) / d + 4
        h = Math.round(h * 60 + (h < 0 ? 360 : 0))
        return `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
      }
      case 'CMYK':
        if (c.c != null && c.m != null && c.y != null && c.k != null)
          return `C${Math.round(c.c)} M${Math.round(c.m)} Y${Math.round(c.y)} K${Math.round(c.k)}`
        return c.hex
      default: return c.hex
    }
  }

  const rows = colors.map((c, i) => {
    const y = 20 + i * rowHeight
    const cx = 20 + iconSize / 2
    const cy = y + iconSize / 2
    return `
      <circle cx="${cx}" cy="${cy}" r="${iconSize / 2}" fill="${c.hex}" />
      <text x="${20 + iconSize + 16}" y="${cy - 6}" font-size="14" fill="#ffffff" font-family="monospace">${formatCode(c)}</text>
      <text x="${20 + iconSize + 16}" y="${cy + 14}" font-size="12" fill="#aaaaaa" font-family="sans-serif">${c.name || c.hex}</text>
    `
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background:#1a1a1a">
  ${rows}
</svg>`
}

export function downloadSVG(svg: string, filename: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  downloadBlob(blob, filename)
}

export async function downloadPNG(
  svg: string,
  filename: string,
  dpi: 72 | 150 | 300
): Promise<void> {
  const scale = dpi / 72
  const parser = new DOMParser()
  const doc = parser.parseFromString(svg, 'image/svg+xml')
  const svgEl = doc.documentElement
  const baseWidth = parseInt(svgEl.getAttribute('width') ?? '600')
  const baseHeight = parseInt(svgEl.getAttribute('height') ?? '400')

  const canvas = document.createElement('canvas')
  canvas.width = baseWidth * scale
  canvas.height = baseHeight * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const img = new Image()
  const svgBlob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svgBlob)

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve()
    }
    img.onerror = reject
    img.src = url
  })

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename)
  }, 'image/png')
}

// ---- CSV 書き出し ----

export function generateCSV(colors: Color[]): string {
  const header = 'HEX,Name,R,G,B,Alpha,Memo,SpotColor'
  const rows = colors.map((c) => {
    const r = parseInt(c.hex.slice(1, 3), 16)
    const g = parseInt(c.hex.slice(3, 5), 16)
    const b = parseInt(c.hex.slice(5, 7), 16)
    const memo = (c.memo ?? '').replace(/"/g, '""')
    const spot = (c.spot_color ?? '').replace(/"/g, '""')
    return `${c.hex},"${c.name}",${r},${g},${b},${c.alpha},"${memo}","${spot}"`
  })
  return [header, ...rows].join('\n')
}

export function downloadCSV(colors: Color[], filename: string) {
  const blob = new Blob([generateCSV(colors)], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

// ---- JSON 書き出し ----

export function generatePaletteJSON(colors: Color[]): string {
  const palette = colors.map((c) => ({
    hex: c.hex,
    name: c.name,
    alpha: c.alpha,
    memo: c.memo,
    spot_color: c.spot_color,
    cmyk: c.c != null ? { c: c.c, m: c.m, y: c.y, k: c.k } : null,
  }))
  return JSON.stringify({ exportedAt: new Date().toISOString(), colors: palette }, null, 2)
}

export function downloadPaletteJSON(colors: Color[], filename: string) {
  const blob = new Blob([generatePaletteJSON(colors)], { type: 'application/json' })
  downloadBlob(blob, filename)
}

// ---- 全データエクスポート ----

export function generateAllDataJSON(colors: Color[], folders: Folder[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      folders,
      colors,
    },
    null,
    2
  )
}

export function downloadAllDataJSON(colors: Color[], folders: Folder[], filename: string) {
  const blob = new Blob([generateAllDataJSON(colors, folders)], { type: 'application/json' })
  downloadBlob(blob, filename)
}

// ---- ASE（Adobe Swatch Exchange）書き出し ----
// ASE は Big-Endian バイナリ形式

export function generateASE(colors: Color[]): ArrayBuffer {
  const blocks: ArrayBuffer[] = []

  for (const color of colors) {
    const r = parseInt(color.hex.slice(1, 3), 16) / 255
    const g = parseInt(color.hex.slice(3, 5), 16) / 255
    const b = parseInt(color.hex.slice(5, 7), 16) / 255

    // 色名 (UTF-16 BE + null terminator)
    const nameUtf16 = new Uint16Array(color.name.length + 1)
    for (let i = 0; i < color.name.length; i++) nameUtf16[i] = color.name.charCodeAt(i)
    nameUtf16[color.name.length] = 0
    const nameBytes = new Uint8Array(nameUtf16.buffer)
    // Big-Endian に変換
    const nameBE = new Uint8Array(nameBytes.length)
    for (let i = 0; i < nameBytes.length; i += 2) {
      nameBE[i] = nameBytes[i + 1]
      nameBE[i + 1] = nameBytes[i]
    }

    // color model "RGB " (4 bytes) + 3 floats (4 bytes each) + color type (2 bytes)
    const colorDataSize = 4 + 4 * 3 + 2
    const blockDataSize = 2 + nameBE.length + colorDataSize
    const block = new ArrayBuffer(2 + 4 + blockDataSize)
    const view = new DataView(block)
    view.setUint16(0, 0x0001, false)       // block type: color entry
    view.setUint32(2, blockDataSize, false) // block length
    view.setUint16(6, color.name.length + 1, false) // name length (char count)

    const blockBytes = new Uint8Array(block)
    blockBytes.set(nameBE, 8)

    const colorOffset = 8 + nameBE.length
    // "RGB " 4 bytes
    blockBytes[colorOffset] = 0x52     // R
    blockBytes[colorOffset + 1] = 0x47 // G
    blockBytes[colorOffset + 2] = 0x42 // B
    blockBytes[colorOffset + 3] = 0x20 // (space)

    const colorView = new DataView(block)
    colorView.setFloat32(colorOffset + 4, r, false)
    colorView.setFloat32(colorOffset + 8, g, false)
    colorView.setFloat32(colorOffset + 12, b, false)
    colorView.setUint16(colorOffset + 16, 0, false) // color type: global

    blocks.push(block)
  }

  const totalSize = 8 + blocks.reduce((s, b) => s + b.byteLength, 0)
  const result = new ArrayBuffer(totalSize)
  const resultBytes = new Uint8Array(result)
  const header = new DataView(result)

  // "ASEF" signature
  resultBytes[0] = 0x41; resultBytes[1] = 0x53
  resultBytes[2] = 0x45; resultBytes[3] = 0x46
  header.setUint16(4, 1, false)  // version major
  header.setUint16(6, 0, false)  // version minor

  let offset = 8
  for (const block of blocks) {
    resultBytes.set(new Uint8Array(block), offset)
    offset += block.byteLength
  }

  return result
}

export function downloadASE(colors: Color[], filename: string) {
  const buffer = generateASE(colors)
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  downloadBlob(blob, filename)
}

// ---- 透明背景の丸アイコン PNG（1色1ファイル）----

/**
 * 指定した色の丸アイコンを透明背景の PNG Blob として生成する。
 * Canvas API を使用するためブラウザ環境専用。
 */
export async function generateColorCirclePNG(
  hex: string,
  alpha: number,
  size: number
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  ctx.clearRect(0, 0, size, size) // 透明背景
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
  ctx.fill()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PNG 生成に失敗しました'))
    }, 'image/png')
  })
}

/**
 * 複数の色を1色1ファイルの透明背景PNG にして ZIP でダウンロードする。
 */
export async function downloadColorPNGsAsZip(
  colors: Color[],
  size: number,
  zipName: string
): Promise<void> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const folder = zip.folder(zipName) ?? zip

  for (const color of colors) {
    const blob = await generateColorCirclePNG(color.hex, color.alpha, size)
    const rawName = (color.name || color.hex).replace(/[\\/:*?"<>|#]/g, '_')
    folder.file(`${rawName}.png`, blob)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  downloadBlob(content, `${zipName}.zip`)
}

/**
 * 色をクリップボードにコピーする。
 * 可能な場合はPNG丸アイコン（64px）も一緒にコピーする。
 * 非対応ブラウザはテキストのみにフォールバック。
 */
export async function copyColorToClipboard(hex: string, alpha: number, text: string): Promise<void> {
  try {
    const blob = await generateColorCirclePNG(hex, alpha, 64)
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ])
  } catch {
    // ClipboardItem 非対応 or 権限なし → テキストのみ
    await navigator.clipboard.writeText(text)
  }
}

/**
 * SVG（パレット）と PNG（丸アイコン×色数）を1つの ZIP にまとめてダウンロードする。
 */
export async function downloadBothAsZip(
  colors: Color[],
  svgOptions: { format: 'HEX' | 'RGB' | 'HSL' | 'CMYK'; iconSize: 64 | 128 | 256 },
  zipName: string
): Promise<void> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  // SVG をルートに追加
  const svg = generatePaletteSVG(colors, svgOptions)
  zip.file(`${zipName}-palette.svg`, svg)

  // PNG フォルダを作成して各色を追加
  const pngFolder = zip.folder('png') ?? zip
  for (const color of colors) {
    const blob = await generateColorCirclePNG(color.hex, color.alpha, svgOptions.iconSize)
    const rawName = (color.name || color.hex).replace(/[\\/:*?"<>|#]/g, '_')
    pngFolder.file(`${rawName}.png`, blob)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  downloadBlob(content, `${zipName}.zip`)
}
