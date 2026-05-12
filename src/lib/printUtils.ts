import type { CmykSource } from '@/types/database'

/**
 * TAC（Total Area Coverage）値を計算する。
 * C + M + Y + K の合計。印刷所上限は通常 300〜320%。
 */
export function calcTAC(c: number, m: number, y: number, k: number): number {
  return c + m + y + k
}

/**
 * TAC 値が上限を超えているかを判定する。
 * limit のデフォルトは 320（一般的なオフセット印刷上限）。
 */
export function isTACWarning(tac: number, limit = 320): boolean {
  return tac > limit
}

/**
 * 簡易色域警告：sRGB の色が CMYK 再現範囲外かを判定する。
 * 判定基準：
 *   - RGB の最大チャンネルに対する彩度（max-min / max）が 0.8 超
 *   - かつ RGB のいずれかのチャンネルが 200 超（明るい鮮やか色）
 *   - かつ最小チャンネルが 50 未満（暗い部分がある＝高コントラスト）
 * この条件に合う鮮やかな赤・緑・青・シアン系はCMYK印刷で再現が難しい。
 */
export function isOutOfGamut(hex: string): boolean {
  if (hex.length < 7) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const saturation = max === 0 ? 0 : (max - min) / max
  return saturation > 0.8 && (r > 200 || g > 200 || b > 200) && min < 50
}

/**
 * cmyk_source の日本語表示ラベルを返す。
 */
export function cmykSourceLabel(source: CmykSource | null): string {
  if (!source) return ''
  const labels: Record<CmykSource, string> = {
    manual: '手動入力',
    converted: '変換値',
    print_spec: '印刷指定',
  }
  return labels[source]
}
