// nearest-color は CommonJS モジュールのため dynamic import で対応
let nearestColorFn: ((hex: string) => { name: string; value: string } | null) | null = null

async function getNearestColor() {
  if (nearestColorFn) return nearestColorFn
  const nearestColor = (await import('nearest-color')).default
  const colorNameList = (await import('color-name-list')) as unknown as { name: string; hex: string }[]
  const colors: Record<string, string> = {}
  for (const c of colorNameList) {
    colors[c.name] = c.hex
  }
  nearestColorFn = nearestColor.from(colors)
  return nearestColorFn
}

export async function getColorName(hex: string): Promise<string> {
  try {
    const fn = await getNearestColor()
    const result = fn?.(hex)
    return result?.name ?? hex
  } catch {
    return hex
  }
}

// HEXフォーマットバリデーション
export function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

// RGB文字列 → HEX変換（例: "rgb(255, 0, 0)" → "#ff0000"）
export function rgbStringToHex(rgb: string): string | null {
  const match = rgb.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/)
  if (!match) return null
  const r = parseInt(match[1]).toString(16).padStart(2, '0')
  const g = parseInt(match[2]).toString(16).padStart(2, '0')
  const b = parseInt(match[3]).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

// HSL文字列 → HEX変換（例: "hsl(0, 100%, 50%)" → "#ff0000"）
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

// 入力文字列を正規化して HEX に変換（#RRGGBB / rgb() / hsl() に対応）
export function normalizeToHex(input: string): string | null {
  const trimmed = input.trim()
  if (isValidHex(trimmed)) return trimmed.toUpperCase()
  const fromRgb = rgbStringToHex(trimmed)
  if (fromRgb) return fromRgb.toUpperCase()
  const fromHsl = hslStringToHex(trimmed)
  if (fromHsl) return fromHsl.toUpperCase()
  return null
}
