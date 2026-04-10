/**
 * HEX 文字列を HSL のタプル [h, s, l] に変換する。
 * h: 0〜360, s: 0〜100, l: 0〜100
 */
export function hexToHsl(hex: string): [number, number, number] {
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
export function hslToHex(h: number, s: number, l: number): string {
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

export type MultiColorPattern = 'harmony' | 'contrast' | 'blend'

export const MULTI_PATTERN_LABELS: Record<MultiColorPattern, string> = {
  harmony: 'ハーモニー',
  contrast: 'コントラスト',
  blend: 'ブレンド',
}

/** 円環上の平均色相（0〜360）を返す。 */
function circularMeanHue(hues: number[]): number {
  const sinSum = hues.reduce((s, h) => s + Math.sin((h * Math.PI) / 180), 0)
  const cosSum = hues.reduce((s, h) => s + Math.cos((h * Math.PI) / 180), 0)
  const mean = Math.atan2(sinSum / hues.length, cosSum / hues.length) * (180 / Math.PI)
  return Math.round((mean + 360) % 360)
}

/**
 * 複数の起点色から配色パレットを生成する。
 * - harmony : 起点色の平均色相を中心に類似色5色を加えた調和パレット
 * - contrast: 起点色それぞれに補色を追加した高コントラストパレット
 * - blend   : 起点色を色相順にソートし隣接間を補間した連続グラデーション
 * 重複は除去し最大8色を返す。
 */
export function generatePaletteFromMultiple(
  baseHexes: string[],
  pattern: MultiColorPattern,
): string[] {
  if (baseHexes.length === 0) return []
  if (baseHexes.length === 1) return generateScheme(baseHexes[0], 'analogous')

  const hslValues = baseHexes.map((h) => hexToHsl(h))

  switch (pattern) {
    case 'blend': {
      // 色相順にソートして隣接ペアを補間
      const sorted = hslValues
        .map((hsl, i) => ({ hsl, hex: baseHexes[i] }))
        .sort((a, b) => a.hsl[0] - b.hsl[0])
      const result: string[] = []
      for (let i = 0; i < sorted.length; i++) {
        result.push(sorted[i].hex)
        if (i < sorted.length - 1) {
          const [h1, s1, l1] = sorted[i].hsl
          const [h2, s2, l2] = sorted[i + 1].hsl
          let diff = h2 - h1
          if (diff > 180) diff -= 360
          if (diff < -180) diff += 360
          result.push(
            hslToHex(
              ((h1 + diff * 0.5) + 360) % 360,
              Math.round((s1 + s2) / 2),
              Math.round((l1 + l2) / 2),
            ),
          )
        }
      }
      return [...new Set(result)].slice(0, 8)
    }

    case 'harmony': {
      // 起点色の平均色相を中心に30°ずつ5色を生成して混合
      const avgH = circularMeanHue(hslValues.map((h) => h[0]))
      const avgS = Math.round(hslValues.reduce((s, h) => s + h[1], 0) / hslValues.length)
      const avgL = Math.round(hslValues.reduce((s, h) => s + h[2], 0) / hslValues.length)
      const harmonics = [-30, -15, 0, 15, 30].map((offset) =>
        hslToHex((avgH + offset + 360) % 360, avgS, avgL),
      )
      return [...new Set([...baseHexes, ...harmonics])].slice(0, 8)
    }

    case 'contrast': {
      // 各起点色に補色を追加
      const result = [...baseHexes]
      for (const [h, s, l] of hslValues) {
        result.push(hslToHex((h + 180) % 360, s, l))
      }
      return [...new Set(result)].slice(0, 8)
    }
  }
}

/**
 * 2色間を橋渡しする配色を生成する。
 * 2色の色相を均等に補間した5色パレットを返す。
 */
export function generateBridgeScheme(hex1: string, hex2: string): string[] {
  const [h1, s1, l1] = hexToHsl(hex1)
  const [h2, s2, l2] = hexToHsl(hex2)

  // 短い方向の色相差
  let hueDiff = h2 - h1
  if (hueDiff > 180) hueDiff -= 360
  if (hueDiff < -180) hueDiff += 360

  const midS = Math.round((s1 + s2) / 2)
  const midL = Math.round(Math.max(30, Math.min(70, (l1 + l2) / 2)))

  return [
    hex1,
    hslToHex((h1 + hueDiff * 0.25 + 360) % 360, midS, midL),
    hslToHex((h1 + hueDiff * 0.5 + 360) % 360, midS, midL),
    hslToHex((h1 + hueDiff * 0.75 + 360) % 360, midS, midL),
    hex2,
  ]
}
