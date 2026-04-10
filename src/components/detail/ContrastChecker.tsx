import { useState } from 'react'
import { getContrastRatio, getWCAGLevel, getWCAGThresholds, getSuggestedTextColor, type TextWeight } from '@/lib/contrastUtils'
import { simulateColorVision, COLOR_VISION_LABELS } from '@/lib/colorVisionUtils'
import type { ColorVisionType } from '@/lib/colorVisionUtils'
import type { Color } from '@/types/database'

interface ContrastCheckerProps {
  color: Color
}

const WEIGHT_OPTIONS: { value: TextWeight; label: string; desc: string }[] = [
  { value: 'thin',   label: '細め', desc: '通常基準 AA≥4.5 / AAA≥7' },
  { value: 'normal', label: '標準', desc: '通常基準 AA≥4.5 / AAA≥7' },
  { value: 'bold',   label: '太め', desc: '太字基準 AA≥3 / AAA≥4.5' },
]

export function ContrastChecker({ color }: ContrastCheckerProps) {
  const [compareHex, setCompareHex] = useState('#FFFFFF')
  const [isValid, setIsValid] = useState(true)
  const [textWeight, setTextWeight] = useState<TextWeight>('normal')

  const handleHexChange = (value: string) => {
    setCompareHex(value)
    setIsValid(/^#[0-9A-Fa-f]{6}$/.test(value))
  }

  const ratio = isValid ? getContrastRatio(color.hex, compareHex) : null
  const wcag = ratio !== null ? getWCAGLevel(ratio, textWeight) : null
  const thresholds = getWCAGThresholds(textWeight)
  const suggested = getSuggestedTextColor(color.hex)

  const VISION_TYPES: ColorVisionType[] = ['protanopia', 'deuteranopia', 'tritanopia', 'grayscale']

  return (
    <div className="space-y-3">
      {/* コントラストチェッカー */}
      <div>
        <p className="text-xs text-text-muted mb-2">コントラストチェッカー</p>
        <div className="bg-surface-raised rounded-lg p-3 space-y-2.5">
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
                isValid ? 'border-border' : 'border-red-500',
              ].join(' ')}
            />
          </div>

          {/* テキスト太さ選択 */}
          <div>
            <p className="text-xs text-text-muted mb-1">テキストの太さ</p>
            <div className="flex gap-1">
              {WEIGHT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTextWeight(opt.value)}
                  title={opt.desc}
                  className={[
                    'flex-1 py-1 rounded text-xs border transition-colors',
                    textWeight === opt.value
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-muted hover:border-text-muted',
                  ].join(' ')}
                  style={{ fontWeight: opt.value === 'thin' ? 300 : opt.value === 'bold' ? 700 : 400 }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-1 opacity-70">
              {textWeight === 'bold' ? 'AA≥3 / AAA≥4.5（太字は大きいテキスト扱い）' : 'AA≥4.5 / AAA≥7（通常テキスト）'}
            </p>
          </div>

          {/* プレビュー */}
          {ratio !== null && (
            <div
              className="rounded p-2.5 text-center"
              style={{ backgroundColor: color.hex, color: compareHex }}
            >
              <span style={{ fontWeight: textWeight === 'thin' ? 300 : textWeight === 'bold' ? 700 : 400, fontSize: 14 }}>
                テキストプレビュー
              </span>
            </div>
          )}

          {/* コントラスト比・判定 */}
          {ratio !== null && wcag !== null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-medium text-text-primary">{ratio}:1</span>
                <div className="flex gap-1.5">
                  <span
                    className={[
                      'text-xs px-1.5 py-0.5 rounded font-medium',
                      wcag.AA ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                    ].join(' ')}
                  >
                    AA {wcag.AA ? '✓' : '✗'} ≥{thresholds.AA}
                  </span>
                  <span
                    className={[
                      'text-xs px-1.5 py-0.5 rounded font-medium',
                      wcag.AAA ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                    ].join(' ')}
                  >
                    AAA {wcag.AAA ? '✓' : '✗'} ≥{thresholds.AAA}
                  </span>
                </div>
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
