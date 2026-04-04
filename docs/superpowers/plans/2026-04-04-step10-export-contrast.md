> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

# Step 10: コントラストチェッカー・色覚シミュレーション・ビジュアル書き出し・パレット書き出し・インポート・全データエクスポート

## 目標

WCAG コントラストチェッカー、色覚シミュレーション（P/D/T型 + グレースケール）、SVG/PNG ビジュアル書き出し、CSV/JSON/ASE パレット書き出し、JSON/CSV/ASE インポート、全データ JSON エクスポートを実装する。

---

## アーキテクチャ

```
src/lib/
  contrastUtils.ts         — WCAG contrast ratio 計算
  colorVisionUtils.ts      — 色覚シミュレーション（LMS変換マトリクス）
  exportUtils.ts           — SVG生成, PNG変換（canvas）, CSV/JSON/ASE 書き出し
  importUtils.ts           — ASE/JSON/CSV パース

src/components/detail/
  ContrastChecker.tsx      — DetailPanel 内に組み込むコンポーネント

src/components/export/
  VisualExportModal.tsx    — SVG/PNG 書き出しモーダル
  PaletteExportModal.tsx   — CSV/JSON/ASE 書き出しモーダル
  ImportModal.tsx          — インポートモーダル
```

---

## タスク一覧

### Task 1: src/lib/contrastUtils.ts を作成する

**作成ファイル:** `src/lib/contrastUtils.ts`

```typescript
/**
 * WCAG 2.1 コントラスト比計算ユーティリティ
 * 参考: https://www.w3.org/TR/WCAG21/#contrast-minimum
 */

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1)
  const l2 = getLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100
}

export function getWCAGLevel(ratio: number): { AA: boolean; AAA: boolean } {
  return { AA: ratio >= 4.5, AAA: ratio >= 7 }
}

/**
 * 指定した背景色に対してテキストとして読みやすい色（白 or 黒）を返す
 */
export function getSuggestedTextColor(backgroundHex: string): '#FFFFFF' | '#000000' {
  const ratio_white = getContrastRatio(backgroundHex, '#FFFFFF')
  const ratio_black = getContrastRatio(backgroundHex, '#000000')
  return ratio_white >= ratio_black ? '#FFFFFF' : '#000000'
}
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 2: src/lib/colorVisionUtils.ts を作成する

**作成ファイル:** `src/lib/colorVisionUtils.ts`

```typescript
/**
 * 色覚シミュレーション
 * Machado et al. 2009 の LMS 変換行列を使った簡易実装
 * 参考: http://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
 */

export type ColorVisionType = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'grayscale'

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))

export function simulateColorVision(hex: string, type: ColorVisionType): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  let sr: number, sg: number, sb: number

  switch (type) {
    case 'protanopia': // P型（赤色弱）
      sr = 0.567 * r + 0.433 * g + 0 * b
      sg = 0.558 * r + 0.442 * g + 0 * b
      sb = 0 * r + 0.242 * g + 0.758 * b
      break
    case 'deuteranopia': // D型（緑色弱）
      sr = 0.625 * r + 0.375 * g + 0 * b
      sg = 0.7 * r + 0.3 * g + 0 * b
      sb = 0 * r + 0.3 * g + 0.7 * b
      break
    case 'tritanopia': // T型（青色弱）
      sr = 0.95 * r + 0.05 * g + 0 * b
      sg = 0 * r + 0.433 * g + 0.567 * b
      sb = 0 * r + 0.475 * g + 0.525 * b
      break
    case 'grayscale': {
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      sr = sg = sb = gray
      break
    }
    default:
      sr = r; sg = g; sb = b
  }

  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0')
  return `#${toHex(sr)}${toHex(sg)}${toHex(sb)}`.toUpperCase()
}

export const COLOR_VISION_LABELS: Record<ColorVisionType, string> = {
  protanopia: 'P型（赤色弱）',
  deuteranopia: 'D型（緑色弱）',
  tritanopia: 'T型（青色弱）',
  grayscale: 'グレースケール',
}
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 3: src/lib/exportUtils.ts を作成する

**作成ファイル:** `src/lib/exportUtils.ts`

```typescript
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
      <text x="${20 + iconSize + 16}" y="${cy + 14}" font-size="12" fill="#aaaaaa" font-family="sans-serif">${c.name}</text>
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
  // ASE ヘッダー: 4byte signature "ASEF", version 1.0 (2+2 byte), block count (4 byte)
  const encoder = new TextEncoder()
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

  // ASE ヘッダーは block count を持たない（標準的な実装に合わせる）
  // 代わりに実際の blocks を結合するだけ
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
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 4: src/lib/importUtils.ts を作成する

**作成ファイル:** `src/lib/importUtils.ts`

```typescript
export interface ImportedColor {
  hex: string
  name: string
  alpha: number
  memo?: string
  spot_color?: string
}

export interface ImportResult {
  colors: ImportedColor[]
  errors: string[]
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

// ---- JSON インポート ----

export function parseImportJSON(jsonText: string): ImportResult {
  const errors: string[] = []
  const colors: ImportedColor[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { colors: [], errors: ['JSON のパースに失敗しました'] }
  }

  const data = parsed as { colors?: unknown[] }
  if (!Array.isArray(data?.colors)) {
    return { colors: [], errors: ['colors 配列が見つかりません'] }
  }

  for (const [i, item] of data.colors.entries()) {
    const c = item as Record<string, unknown>
    const hex = (typeof c.hex === 'string' ? c.hex : '').toUpperCase()
    if (!isValidHex(hex)) {
      errors.push(`行 ${i + 1}: 不正な HEX 値 "${c.hex}"`)
      continue
    }
    colors.push({
      hex,
      name: typeof c.name === 'string' ? c.name : hex,
      alpha: typeof c.alpha === 'number' ? c.alpha : 1.0,
      memo: typeof c.memo === 'string' ? c.memo : undefined,
      spot_color: typeof c.spot_color === 'string' ? c.spot_color : undefined,
    })
  }

  return { colors, errors }
}

// ---- CSV インポート ----

export function parseImportCSV(csvText: string): ImportResult {
  const errors: string[] = []
  const colors: ImportedColor[] = []
  const lines = csvText.trim().split('\n')

  // ヘッダー行をスキップ
  const dataLines = lines[0].startsWith('HEX') ? lines.slice(1) : lines

  for (const [i, line] of dataLines.entries()) {
    if (!line.trim()) continue
    // CSV 簡易パース（クォート内のカンマは無視する簡易版）
    const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g) ?? []
    const clean = (s: string) => s.replace(/^"|"$/g, '').trim()

    const hex = clean(cols[0] ?? '').toUpperCase()
    if (!isValidHex(hex)) {
      errors.push(`行 ${i + 2}: 不正な HEX 値 "${cols[0]}"`)
      continue
    }

    const alpha = parseFloat(clean(cols[5] ?? '1'))
    colors.push({
      hex,
      name: clean(cols[1] ?? hex),
      alpha: isNaN(alpha) ? 1.0 : alpha,
      memo: clean(cols[6] ?? '') || undefined,
      spot_color: clean(cols[7] ?? '') || undefined,
    })
  }

  return { colors, errors }
}

// ---- ASE インポート（RGB スウォッチのみ対応） ----

export function parseImportASE(buffer: ArrayBuffer): ImportResult {
  const errors: string[] = []
  const colors: ImportedColor[] = []
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // シグネチャ確認 "ASEF"
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  if (sig !== 'ASEF') {
    return { colors: [], errors: ['ASE ファイルのシグネチャが不正です'] }
  }

  let offset = 8
  while (offset < buffer.byteLength - 6) {
    const blockType = view.getUint16(offset, false)
    const blockLen = view.getUint32(offset + 2, false)
    offset += 6

    if (blockType !== 0x0001) {
      offset += blockLen
      continue
    }

    const nameLen = view.getUint16(offset, false)
    offset += 2
    let name = ''
    for (let i = 0; i < nameLen - 1; i++) {
      name += String.fromCharCode(view.getUint16(offset + i * 2, false))
    }
    offset += nameLen * 2

    // カラーモデル 4 bytes
    const model = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])
    offset += 4

    if (model === 'RGB ') {
      const r = Math.round(view.getFloat32(offset, false) * 255)
      const g = Math.round(view.getFloat32(offset + 4, false) * 255)
      const b = Math.round(view.getFloat32(offset + 8, false) * 255)
      offset += 14 // 3 floats + color type (2 bytes)
      const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
      colors.push({ hex, name: name || hex, alpha: 1.0 })
    } else {
      errors.push(`非 RGB スウォッチ（${model.trim()}）はスキップされました`)
      offset += blockLen - 2 - nameLen * 2 - 4
    }
  }

  return { colors, errors }
}
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 5: src/components/detail/ContrastChecker.tsx を作成する

**作成ファイル:** `src/components/detail/ContrastChecker.tsx`

```typescript
import { useState } from 'react'
import { getContrastRatio, getWCAGLevel, getSuggestedTextColor } from '@/lib/contrastUtils'
import { simulateColorVision, COLOR_VISION_LABELS } from '@/lib/colorVisionUtils'
import type { ColorVisionType } from '@/lib/colorVisionUtils'
import type { Color } from '@/types/database'

interface ContrastCheckerProps {
  color: Color
}

export function ContrastChecker({ color }: ContrastCheckerProps) {
  const [compareHex, setCompareHex] = useState('#FFFFFF')
  const [isValidHex, setIsValidHex] = useState(true)

  const handleHexChange = (value: string) => {
    setCompareHex(value)
    setIsValidHex(/^#[0-9A-Fa-f]{6}$/.test(value))
  }

  const ratio = isValidHex ? getContrastRatio(color.hex, compareHex) : null
  const wcag = ratio !== null ? getWCAGLevel(ratio) : null
  const suggested = getSuggestedTextColor(color.hex)

  const VISION_TYPES: ColorVisionType[] = ['protanopia', 'deuteranopia', 'tritanopia', 'grayscale']

  return (
    <div className="space-y-3">
      {/* コントラストチェッカー */}
      <div>
        <p className="text-xs text-text-muted mb-2">コントラストチェッカー</p>
        <div className="bg-surface-raised rounded-lg p-3 space-y-2">
          {/* 比較色入力 */}
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full border border-border flex-shrink-0"
              style={{ backgroundColor: compareHex }}
            />
            <input
              type="text"
              value={compareHex}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#FFFFFF"
              className={[
                'flex-1 bg-surface-overlay rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none border',
                isValidHex ? 'border-border' : 'border-red-500',
              ].join(' ')}
            />
          </div>

          {/* プレビュー */}
          {ratio !== null && (
            <div
              className="rounded p-2 text-center text-sm font-medium"
              style={{ backgroundColor: color.hex, color: compareHex }}
            >
              テキストプレビュー
            </div>
          )}

          {/* 比率・判定 */}
          {ratio !== null && wcag !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-text-primary">{ratio}:1</span>
              <div className="flex gap-1.5">
                <span
                  className={[
                    'text-xs px-1.5 py-0.5 rounded font-medium',
                    wcag.AA ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                  ].join(' ')}
                >
                  AA {wcag.AA ? '✓' : '✗'}
                </span>
                <span
                  className={[
                    'text-xs px-1.5 py-0.5 rounded font-medium',
                    wcag.AAA ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                  ].join(' ')}
                >
                  AAA {wcag.AAA ? '✓' : '✗'}
                </span>
              </div>
            </div>
          )}

          {/* テキスト色提案 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">推奨テキスト色：</span>
            <div
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: suggested }}
            />
            <span className="text-xs font-mono text-text-secondary">{suggested}</span>
          </div>
        </div>
      </div>

      {/* 色覚シミュレーション */}
      <div>
        <p className="text-xs text-text-muted mb-2">色覚シミュレーション</p>
        <div className="bg-surface-raised rounded-lg p-3 space-y-2">
          {VISION_TYPES.map((type) => {
            const simHex = simulateColorVision(color.hex, type)
            return (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full border border-border flex-shrink-0"
                  style={{ backgroundColor: simHex }}
                />
                <span className="text-xs text-text-muted flex-1">{COLOR_VISION_LABELS[type]}</span>
                <span className="text-xs font-mono text-text-secondary">{simHex}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 6: DetailPanel に ContrastChecker を追加する

**変更ファイル:** `src/components/detail/DetailPanel.tsx`

変更箇所：
1. `ContrastChecker` をインポート追加
2. メモセクションの下に `<ContrastChecker color={color} />` を追加

```typescript
// インポート追加
import { ContrastChecker } from '@/components/detail/ContrastChecker'

// メモセクション（既存）の下に追加
{/* コントラストチェッカー・色覚シミュレーション */}
<ContrastChecker color={color} />
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 7: src/components/export/VisualExportModal.tsx を作成する

**作成ファイル:** `src/components/export/VisualExportModal.tsx`

```typescript
import { useState } from 'react'
import { generatePaletteSVG, downloadSVG, downloadPNG } from '@/lib/exportUtils'
import type { Color, Folder } from '@/types/database'

interface VisualExportModalProps {
  folders: Folder[]
  allColors: Color[]
  onClose: () => void
}

type ExportFormat = 'HEX' | 'RGB' | 'HSL' | 'CMYK'
type IconSize = 64 | 128 | 256
type DPI = 72 | 150 | 300

export function VisualExportModal({ folders, allColors, onClose }: VisualExportModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all')
  const [format, setFormat] = useState<ExportFormat>('HEX')
  const [iconSize, setIconSize] = useState<IconSize>(64)
  const [dpi, setDpi] = useState<DPI>(72)
  const [exporting, setExporting] = useState(false)

  const targetColors =
    selectedFolderId === 'all'
      ? allColors
      : allColors.filter((c) => c.folder_id === selectedFolderId)

  const folderName =
    selectedFolderId === 'all'
      ? 'all-colors'
      : (folders.find((f) => f.id === selectedFolderId)?.name ?? 'palette')

  async function handleExport(type: 'svg' | 'png' | 'both') {
    setExporting(true)
    const svg = generatePaletteSVG(targetColors, { format, iconSize })
    const filename = `${folderName}-palette`
    try {
      if (type === 'svg' || type === 'both') downloadSVG(svg, `${filename}.svg`)
      if (type === 'png' || type === 'both') await downloadPNG(svg, `${filename}.png`, dpi)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl w-96 p-6 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">ビジュアル書き出し</h2>
          <button onClick={onClose} type="button" className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        {/* フォルダ選択 */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">対象フォルダ</label>
          <select
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            className="w-full bg-surface-raised border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none"
          >
            <option value="all">すべての色（{allColors.length}色）</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}（{allColors.filter((c) => c.folder_id === f.id).length}色）
              </option>
            ))}
          </select>
        </div>

        {/* カラーコードフォーマット */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">カラーコード形式</label>
          <div className="flex gap-2 flex-wrap">
            {(['HEX', 'RGB', 'HSL', 'CMYK'] as ExportFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={[
                  'px-3 py-1 rounded text-xs border transition-colors',
                  format === f
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-text-muted',
                ].join(' ')}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* アイコンサイズ */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">アイコンサイズ</label>
          <div className="flex gap-2">
            {([64, 128, 256] as IconSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setIconSize(s)}
                className={[
                  'px-3 py-1 rounded text-xs border transition-colors',
                  iconSize === s
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-text-muted',
                ].join(' ')}
              >
                {s}px
              </button>
            ))}
          </div>
        </div>

        {/* PNG 解像度 */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">PNG 解像度</label>
          <div className="flex gap-2">
            {([72, 150, 300] as DPI[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDpi(d)}
                className={[
                  'px-3 py-1 rounded text-xs border transition-colors',
                  dpi === d
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-text-muted',
                ].join(' ')}
              >
                {d} dpi
              </button>
            ))}
          </div>
        </div>

        {/* 色数表示 */}
        <p className="text-xs text-text-muted">
          書き出し対象：{targetColors.length}色
        </p>

        {/* ダウンロードボタン */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleExport('svg')}
            disabled={exporting || targetColors.length === 0}
            className="flex-1 py-2 rounded bg-surface-raised border border-border text-sm text-text-primary hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            SVG
          </button>
          <button
            type="button"
            onClick={() => handleExport('png')}
            disabled={exporting || targetColors.length === 0}
            className="flex-1 py-2 rounded bg-surface-raised border border-border text-sm text-text-primary hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            PNG
          </button>
          <button
            type="button"
            onClick={() => handleExport('both')}
            disabled={exporting || targetColors.length === 0}
            className="flex-1 py-2 rounded bg-accent text-white text-sm hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            両方
          </button>
        </div>
      </div>
    </div>
  )
}
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 8: src/components/export/PaletteExportModal.tsx を作成する

**作成ファイル:** `src/components/export/PaletteExportModal.tsx`

```typescript
import { useState } from 'react'
import { downloadCSV, downloadPaletteJSON, downloadASE } from '@/lib/exportUtils'
import type { Color, Folder } from '@/types/database'

interface PaletteExportModalProps {
  folders: Folder[]
  allColors: Color[]
  onClose: () => void
}

type ExportFileFormat = 'CSV' | 'JSON' | 'ASE'

export function PaletteExportModal({ folders, allColors, onClose }: PaletteExportModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all')
  const [fileFormat, setFileFormat] = useState<ExportFileFormat>('CSV')

  const targetColors =
    selectedFolderId === 'all'
      ? allColors
      : allColors.filter((c) => c.folder_id === selectedFolderId)

  const folderName =
    selectedFolderId === 'all'
      ? 'all-colors'
      : (folders.find((f) => f.id === selectedFolderId)?.name ?? 'palette')

  function handleDownload() {
    const filename = `${folderName}-palette`
    switch (fileFormat) {
      case 'CSV': downloadCSV(targetColors, `${filename}.csv`); break
      case 'JSON': downloadPaletteJSON(targetColors, `${filename}.json`); break
      case 'ASE': downloadASE(targetColors, `${filename}.ase`); break
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl w-96 p-6 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">パレット書き出し</h2>
          <button onClick={onClose} type="button" className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        {/* フォルダ選択 */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">対象フォルダ</label>
          <select
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            className="w-full bg-surface-raised border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none"
          >
            <option value="all">すべての色（{allColors.length}色）</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}（{allColors.filter((c) => c.folder_id === f.id).length}色）
              </option>
            ))}
          </select>
        </div>

        {/* 形式選択 */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">ファイル形式</label>
          <div className="flex gap-2">
            {(['CSV', 'JSON', 'ASE'] as ExportFileFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFileFormat(f)}
                className={[
                  'flex-1 py-2 rounded text-xs border transition-colors',
                  fileFormat === f
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-text-muted',
                ].join(' ')}
              >
                {f}
                {f === 'CSV' && <span className="block text-text-muted mt-0.5">汎用</span>}
                {f === 'JSON' && <span className="block text-text-muted mt-0.5">バックアップ</span>}
                {f === 'ASE' && <span className="block text-text-muted mt-0.5">Illustrator</span>}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-text-muted">書き出し対象：{targetColors.length}色</p>

        <button
          type="button"
          onClick={handleDownload}
          disabled={targetColors.length === 0}
          className="w-full py-2 rounded bg-accent text-white text-sm hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ダウンロード
        </button>
      </div>
    </div>
  )
}
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 9: 全データエクスポートボタンを AppLayout のメニューに追加する

**変更ファイル:** AppLayout または設定画面（プロジェクト構造に応じて配置先を確認）

方針：
- `downloadAllDataJSON` を `exportUtils.ts` からインポート
- `useColorStore` の全 colors と `useFolderStore` の全 folders を渡す
- ボタンクリックで即時ダウンロード（モーダル不要）

```typescript
import { downloadAllDataJSON } from '@/lib/exportUtils'
import { useColorStore } from '@/store/colorStore'
import { useFolderStore } from '@/store/folderStore'

// コンポーネント内
const { colors } = useColorStore()
const { folders } = useFolderStore()

function handleExportAll() {
  const filename = `colorpicker-backup-${new Date().toISOString().slice(0, 10)}.json`
  downloadAllDataJSON(colors, folders, filename)
}

// JSX
<button onClick={handleExportAll} type="button" className="...">
  全データを書き出す
</button>
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

**コミット:**
```bash
git add src/lib/contrastUtils.ts src/lib/colorVisionUtils.ts src/lib/exportUtils.ts src/lib/importUtils.ts src/components/detail/ContrastChecker.tsx src/components/detail/DetailPanel.tsx src/components/export/VisualExportModal.tsx src/components/export/PaletteExportModal.tsx
git commit -m "$(cat <<'EOF'
feat: add contrast checker, color vision simulation, visual/palette export, import, and full data export

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
