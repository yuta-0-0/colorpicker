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
