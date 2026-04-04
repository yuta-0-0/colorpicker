/**
 * HEX 文字列を HSL のタプル [h, s, l] に変換する。
 * h: 0〜360, s: 0〜100, l: 0〜100
 */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    return [0, 0, Math.round(l * 100)]
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4

  const hDeg = Math.round(h * 60 + (h < 0 ? 360 : 0))
  return [hDeg, Math.round(s * 100), Math.round(l * 100)]
}

/**
 * HSL を HEX 文字列（#RRGGBB 大文字）に変換する。
 * h: 0〜360, s: 0〜100, l: 0〜100
 */
function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100
  const ln = l / 100
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number): string => {
    const k = (n + h / 30) % 12
    const color = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

export type ColorScheme =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'split-complementary'

/**
 * ベース色の HEX から指定した配色パターンの色配列を返す。
 * ベース色は常に配列の最初の要素として含まれる。
 */
export function generateScheme(baseHex: string, scheme: ColorScheme): string[] {
  const [h, s, l] = hexToHsl(baseHex)
  switch (scheme) {
    case 'complementary':
      return [baseHex, hslToHex((h + 180) % 360, s, l)]
    case 'analogous':
      return [
        hslToHex((h - 30 + 360) % 360, s, l),
        baseHex,
        hslToHex((h + 30) % 360, s, l),
      ]
    case 'triadic':
      return [
        baseHex,
        hslToHex((h + 120) % 360, s, l),
        hslToHex((h + 240) % 360, s, l),
      ]
    case 'tetradic':
      return [
        baseHex,
        hslToHex((h + 90) % 360, s, l),
        hslToHex((h + 180) % 360, s, l),
        hslToHex((h + 270) % 360, s, l),
      ]
    case 'split-complementary':
      return [
        baseHex,
        hslToHex((h + 150) % 360, s, l),
        hslToHex((h + 210) % 360, s, l),
      ]
  }
}

export const SCHEME_LABELS: Record<ColorScheme, string> = {
  complementary: '補色',
  analogous: '類似色',
  triadic: 'トライアド',
  tetradic: 'テトラード',
  'split-complementary': 'スプリット補色',
}

export const ALL_SCHEMES: ColorScheme[] = [
  'complementary',
  'analogous',
  'triadic',
  'tetradic',
  'split-complementary',
]
