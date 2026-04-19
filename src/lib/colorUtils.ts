import { JAPANESE_TRADITIONAL_COLORS } from './data/japaneseTraditionalColors'

// ---- ユーティリティ ----

function hexToRgb255(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

// ---- 伝統色名（同期・距離閾値付き） ----
// 閾値40: RGB空間でユークリッド距離が40以下の場合のみ伝統色名を返す
// 遠い色には空文字を返すことで「似てない色に同じ伝統色が割り当たる」問題を防ぐ
const TRADITIONAL_THRESHOLD = 40

export function getTraditionalColorNameSync(hex: string): string {
  const [r, g, b] = hexToRgb255(hex)
  let bestName = ''
  let bestDist = Infinity
  for (const [name, value] of Object.entries(JAPANESE_TRADITIONAL_COLORS)) {
    const [tr, tg, tb] = hexToRgb255(value)
    const dist = Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2)
    if (dist < bestDist) {
      bestDist = dist
      bestName = name
    }
  }
  return bestDist <= TRADITIONAL_THRESHOLD ? bestName : ''
}

/** 日本の伝統色名（距離閾値あり・近い色のみ返す） */
export async function getTraditionalColorName(hex: string): Promise<string> {
  return getTraditionalColorNameSync(hex)
}

/** 伝統色が存在するかどうか（フィルター用） */
export function hasTraditionalColor(hex: string): boolean {
  return getTraditionalColorNameSync(hex) !== ''
}

// ---- 英語色名（color-name-list 最近傍） ----

let nearestEnFn: ((hex: string) => { name: string; value: string } | null) | null = null

async function getNearestEn() {
  if (nearestEnFn) return nearestEnFn
  const nearestColor = (await import('nearest-color')).default
  const { colornames } = await import('color-name-list')
  const list = colornames as { name: string; hex: string }[]
  const map: Record<string, string> = {}
  for (const c of list) {
    map[c.name] = c.hex
  }
  nearestEnFn = nearestColor.from(map)
  return nearestEnFn
}

/** 英語色名（color-name-list 最近傍） */
export async function getEnglishColorName(hex: string): Promise<string> {
  try {
    const fn = await getNearestEn()
    const result = fn?.(hex)
    return result?.name ?? hex
  } catch {
    return hex
  }
}

/**
 * 色を新規保存するときの自動命名（伝統色名 → 英語名フォールバック）
 * 伝統色が見つかれば伝統色名、なければ英語名を使う
 */
export async function getColorName(hex: string): Promise<string> {
  const traditional = getTraditionalColorNameSync(hex)
  if (traditional) return traditional
  return getEnglishColorName(hex)
}

// ---- カラーコードバリデーション ----

export function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

export function rgbStringToHex(rgb: string): string | null {
  const match = rgb.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/)
  if (!match) return null
  const r = parseInt(match[1]).toString(16).padStart(2, '0')
  const g = parseInt(match[2]).toString(16).padStart(2, '0')
  const b = parseInt(match[3]).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

export function hslStringToHex(hsl: string): string | null {
  const match = hsl.match(/hsl\(\s*(\d+),\s*(\d+)%,\s*(\d+)%\s*\)/)
  if (!match) return null
  const h = parseInt(match[1]) / 360
  const s = parseInt(match[2]) / 100
  const l = parseInt(match[3]) / 100

  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function normalizeToHex(input: string): string | null {
  const trimmed = input.trim()
  if (isValidHex(trimmed)) return trimmed.toUpperCase()
  const fromRgb = rgbStringToHex(trimmed)
  if (fromRgb) return fromRgb.toUpperCase()
  const fromHsl = hslStringToHex(trimmed)
  if (fromHsl) return fromHsl.toUpperCase()
  return null
}
