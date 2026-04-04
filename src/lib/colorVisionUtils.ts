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
