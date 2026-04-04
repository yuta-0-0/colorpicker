import { useState } from 'react'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { useColorStore } from '@/store/colorStore'
import { isValidHex } from '@/lib/colorUtils'
import {
  generateScheme,
  SCHEME_LABELS,
  ALL_SCHEMES,
  type ColorScheme,
} from '@/lib/colorGenerator'

export function GeneratorView() {
  const { addColor } = useColorStore()
  const [inputValue, setInputValue] = useState('#3A7BD5')
  const [activeScheme, setActiveScheme] = useState<ColorScheme>('complementary')
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [savingAll, setSavingAll] = useState(false)

  const isValid = isValidHex(inputValue)
  const generatedColors = isValid ? generateScheme(inputValue, activeScheme) : []

  const handleInputChange = (value: string) => {
    setInputValue(value)
  }

  const handleSaveOne = async (hex: string, index: number) => {
    setSavingIndex(index)
    await addColor(hex)
    setSavingIndex(null)
  }

  const handleSaveAll = async () => {
    if (generatedColors.length === 0) return
    setSavingAll(true)
    for (const hex of generatedColors) {
      await addColor(hex)
    }
    setSavingAll(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <h2 className="text-base font-medium text-text-primary mb-1">カラージェネレーター</h2>
          <p className="text-xs text-text-muted">ベース色から配色パターンを自動生成します</p>
        </div>

        {/* ベース色入力 */}
        <div className="bg-surface-raised rounded-xl p-4 space-y-3">
          <p className="text-xs text-text-muted">ベース色</p>
          <div className="flex items-center gap-3">
            {/* ネイティブカラーピッカー */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer border border-border">
              <div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: isValid ? inputValue : '#888' }}
              />
              <input
                type="color"
                value={isValid ? inputValue : '#888888'}
                onChange={(e) => handleInputChange(e.target.value.toUpperCase())}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="カラーピッカーで選択"
              />
            </div>
            {/* HEX テキスト入力 */}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value.toUpperCase())}
              placeholder="#RRGGBB"
              maxLength={7}
              className={[
                'flex-1 bg-surface-overlay border rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none transition-colors',
                isValid ? 'border-border focus:border-accent' : 'border-red-500/60',
              ].join(' ')}
            />
            {!isValid && inputValue.length > 0 && (
              <span className="text-xs text-red-400 flex-shrink-0">無効な値</span>
            )}
          </div>
        </div>

        {/* 配色パターン選択 */}
        <div className="space-y-2">
          <p className="text-xs text-text-muted">配色パターン</p>
          <div className="flex flex-wrap gap-2">
            {ALL_SCHEMES.map((scheme) => (
              <button
                key={scheme}
                onClick={() => setActiveScheme(scheme)}
                type="button"
                className={[
                  'px-3 py-1.5 text-xs rounded-full border transition-colors',
                  activeScheme === scheme
                    ? 'bg-accent border-accent text-white'
                    : 'bg-surface-raised border-border text-text-secondary hover:border-accent/50 hover:text-text-primary',
                ].join(' ')}
              >
                {SCHEME_LABELS[scheme]}
              </button>
            ))}
          </div>
        </div>

        {/* 生成結果 */}
        {isValid && generatedColors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                生成結果（{generatedColors.length}色）
              </p>
              <button
                onClick={handleSaveAll}
                disabled={savingAll}
                type="button"
                className="px-3 py-1 text-xs bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {savingAll ? '保存中...' : 'すべて保存'}
              </button>
            </div>

            <div className="bg-surface-raised rounded-xl overflow-hidden divide-y divide-border/50">
              {generatedColors.map((hex, index) => (
                <div key={`${hex}-${index}`} className="flex items-center gap-3 px-4 py-3">
                  <ColorSwatch hex={hex} alpha={1} size="sm" />
                  <span className="flex-1 text-sm font-mono text-text-primary">{hex}</span>
                  {index === 0 && activeScheme !== 'analogous' && (
                    <span className="text-xs text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded">ベース</span>
                  )}
                  {activeScheme === 'analogous' && index === 1 && (
                    <span className="text-xs text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded">ベース</span>
                  )}
                  <button
                    onClick={() => handleSaveOne(hex, index)}
                    disabled={savingIndex === index}
                    type="button"
                    className="text-xs text-text-muted hover:text-text-primary disabled:opacity-50 transition-colors px-2 py-1 hover:bg-surface-overlay rounded"
                  >
                    {savingIndex === index ? '保存中...' : '保存'}
                  </button>
                </div>
              ))}
            </div>

            {/* カラーバー（全色を帯状で並べて配色を視覚確認） */}
            <div className="flex rounded-lg overflow-hidden h-8">
              {generatedColors.map((hex, index) => (
                <div
                  key={`bar-${hex}-${index}`}
                  className="flex-1"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>
        )}

        {/* 空状態 */}
        {(!isValid || generatedColors.length === 0) && (
          <div className="flex items-center justify-center py-12 text-text-muted text-sm">
            有効な HEX カラーコードを入力してください
          </div>
        )}
      </div>
    </div>
  )
}
