import { useState, useEffect } from 'react'
import { Center } from '@/components/primitives'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { useColorStore } from '@/store/colorStore'
import { useUIStore } from '@/store/uiStore'
import { usePreviewStore } from '@/store/previewStore'
import { isValidHex } from '@/lib/colorUtils'
import {
  generateScheme,
  generateBridgeScheme,
  generatePaletteFromMultiple,
  hexToHsl,
  hslToHex,
  SCHEME_LABELS,
  ALL_SCHEMES,
  MULTI_PATTERN_LABELS,
  type ColorScheme,
  type MultiColorPattern,
} from '@/lib/colorGenerator'

const DEFAULT_RATIOS = [60, 20, 10, 5, 5]
type GeneratorMode = 'single' | 'bridge' | 'multi'

export function GeneratorView() {
  const { addColor } = useColorStore()
  const { setActiveMode, setActiveSection } = useUIStore()
  const { setSlot } = usePreviewStore()

  const [inputValue, setInputValue] = useState(() => {
    const { selectedColorId, bulkSelectedIds } = useUIStore.getState()
    const { colors } = useColorStore.getState()
    const ids = bulkSelectedIds.length > 0 ? bulkSelectedIds : (selectedColorId ? [selectedColorId] : [])
    if (ids.length === 0) return '#3A7BD5'
    const found = colors.find((c) => c.id === ids[0])
    return found?.hex ?? '#3A7BD5'
  })

  const [seedColors] = useState(() => {
    const { bulkSelectedIds } = useUIStore.getState()
    const { colors } = useColorStore.getState()
    if (bulkSelectedIds.length < 2) return []
    return bulkSelectedIds
      .map((id) => colors.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => !!c)
  })

  const [subInputValue, setSubInputValue] = useState(() => {
    const { bulkSelectedIds } = useUIStore.getState()
    const { colors } = useColorStore.getState()
    if (bulkSelectedIds.length < 2) return '#E74C3C'
    const found = colors.find((c) => c.id === bulkSelectedIds[1])
    return found?.hex ?? '#E74C3C'
  })

  const [mode, setMode] = useState<GeneratorMode>(() => {
    return useUIStore.getState().bulkSelectedIds.length >= 2 ? 'bridge' : 'single'
  })
  // 後方互換：isTwoColorMode は mode === 'bridge' として扱う
  const isTwoColorMode = mode === 'bridge'

  const [activeScheme, setActiveScheme] = useState<ColorScheme>('complementary')
  const [confirmedScheme, setConfirmedScheme] = useState<ColorScheme>('complementary')
  const [isPendingConfirm, setIsPendingConfirm] = useState(false)
  const [multiPattern, setMultiPattern] = useState<MultiColorPattern>('harmony')
  const [multiInputs, setMultiInputs] = useState<string[]>(() => {
    const { bulkSelectedIds } = useUIStore.getState()
    const { colors } = useColorStore.getState()
    if (bulkSelectedIds.length >= 2) {
      const hexes = bulkSelectedIds
        .slice(0, 6)
        .map((id) => colors.find((c) => c.id === id)?.hex)
        .filter((h): h is string => !!h)
      if (hexes.length >= 2) return hexes
    }
    return ['#3A7BD5', '#E74C3C', '#27AE60']
  })
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [ratios, setRatios] = useState<number[]>([])

  const isValid = isValidHex(inputValue)
  const isSubValid = isValidHex(subInputValue)

  const generatedColors = (() => {
    if (mode === 'multi') {
      const validHexes = multiInputs.filter(isValidHex)
      return validHexes.length > 0 ? generatePaletteFromMultiple(validHexes, multiPattern) : []
    }
    if (!isValid) return []
    if (isTwoColorMode && isSubValid) return generateBridgeScheme(inputValue, subInputValue)
    return generateScheme(inputValue, activeScheme)
  })()

  useEffect(() => {
    if (generatedColors.length === 0) { setRatios([]); return }
    setRatios(generatedColors.map((_, i) => DEFAULT_RATIOS[i] ?? 5))
  }, [generatedColors.length, activeScheme, isTwoColorMode, mode, multiPattern])

  const handleRatioChange = (index: number, value: number) => {
    setRatios((prev) => { const next = [...prev]; next[index] = value; return next })
  }

  const handleSaveOne = async (hex: string, index: number) => {
    setSavingIndex(index)
    await addColor(hex)
    setSavingIndex(null)
  }

  const handleSaveAll = async () => {
    if (generatedColors.length === 0) return
    setSavingAll(true)
    for (const hex of generatedColors) await addColor(hex)
    setSavingAll(false)
  }

  const handleSendToPreview = () => {
    const slots: Array<'bg' | 'text' | 'button' | 'accent'> = ['bg', 'text', 'button', 'accent']
    generatedColors.slice(0, 4).forEach((hex, i) => {
      setSlot(slots[i], hex)
    })
    setActiveMode('preview')
    setActiveSection('all')
  }

  const handleSwap = () => {
    const tmp = inputValue
    setInputValue(subInputValue)
    setSubInputValue(tmp)
  }

  // 1色モード: パターン選択 → プレビュー状態へ
  const handleSelectScheme = (scheme: ColorScheme) => {
    setActiveScheme(scheme)
    setIsPendingConfirm(scheme !== confirmedScheme)
  }

  // 確定: 全色保存 + 確定状態を更新
  const handleConfirm = async () => {
    if (generatedColors.length === 0) return
    setSavingAll(true)
    for (const hex of generatedColors) await addColor(hex)
    setSavingAll(false)
    setConfirmedScheme(activeScheme)
    setIsPendingConfirm(false)
  }

  // キャンセル: 確定済みパターンに戻す
  const handleCancelPreview = () => {
    setActiveScheme(confirmedScheme)
    setIsPendingConfirm(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto space-y-5">
        {/* ヘッダー */}
        <div>
          <h2 className="text-base font-medium text-text-primary mb-0.5">カラージェネレーター</h2>
          <p className="text-xs text-text-muted">
            {mode === 'bridge' ? '2色の間を補間した5色パレットを生成します'
              : mode === 'multi' ? '複数の起点色からパレットを生成します'
              : 'ベース色から配色パターンを自動生成します'}
          </p>
        </div>

        {/* モード切り替えタブ */}
        <div className="flex rounded-lg overflow-hidden border border-border text-xs">
          {([
            { key: 'single', label: '1色' },
            { key: 'bridge', label: '2色ブリッジ' },
            { key: 'multi',  label: '複数色' },
          ] as { key: GeneratorMode; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={[
                'flex-1 py-1.5 transition-colors',
                mode === key
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ---- 1色モード ---- */}
        {!isTwoColorMode && mode !== 'multi' && (
          <>
            {/* ベース色入力 */}
            <div className="bg-surface-raised rounded-xl p-4 space-y-3">
              <p className="text-xs text-text-muted">ベース色</p>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-border cursor-pointer">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: isValid ? inputValue : '#888',
                      transition: 'background-color 80ms ease',
                    }}
                  />
                  <input
                    type="color"
                    value={isValid ? inputValue : '#888888'}
                    onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                  placeholder="#RRGGBB"
                  maxLength={7}
                  className={[
                    'flex-1 bg-surface-overlay border rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none transition-colors',
                    isValid ? 'border-border focus:border-accent' : 'border-red-500/60',
                  ].join(' ')}
                />
              </div>

              {/* 色相スライダー */}
              {isValid && (
                <HueSlider
                  hex={inputValue}
                  onChange={(hex) => setInputValue(hex)}
                />
              )}

              {/* seedColors がある場合はクリックでベース色に設定 */}
              {seedColors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/10">
                  <span className="text-xs text-text-muted self-center">選択中：</span>
                  {seedColors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setInputValue(c.hex)}
                      className={[
                        'flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors',
                        inputValue === c.hex
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-text-secondary hover:border-accent/50',
                      ].join(' ')}
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.hex }} />
                      {c.hex}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 配色パターン */}
            <div className="space-y-2">
              <p className="text-xs text-text-muted">配色パターン</p>
              <div className="flex flex-wrap gap-2">
                {ALL_SCHEMES.map((scheme) => (
                  <button
                    key={scheme}
                    onClick={() => handleSelectScheme(scheme)}
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
          </>
        )}

        {/* ---- 2色モード ---- */}
        {isTwoColorMode && (
          <div className="space-y-3">
            {/* ベース + サブ の2スロット横並び */}
            <div className="flex items-stretch gap-2">
              {/* ベース色 */}
              <ColorInputSlot
                label="ベース色"
                value={inputValue}
                onChange={setInputValue}
              />
              {/* スワップボタン */}
              <div className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="w-8 h-8 rounded-full bg-surface-overlay hover:bg-surface-raised border border-border text-text-muted hover:text-text-primary transition-colors text-sm"
                  title="ベースとサブを入れ替え"
                >
                  ⇄
                </button>
              </div>
              {/* サブ色 */}
              <ColorInputSlot
                label="サブ色"
                value={subInputValue}
                onChange={setSubInputValue}
              />
            </div>

            {/* seedColors がある場合：各チップにベース/サブの割り当てボタン */}
            {seedColors.length >= 2 && (
              <div className="bg-surface-raised rounded-xl p-3 space-y-2">
                <p className="text-xs text-text-muted">選択中の色から割り当て</p>
                <div className="space-y-1.5">
                  {seedColors.map((c) => {
                    const isBase = inputValue === c.hex
                    const isSub = subInputValue === c.hex
                    return (
                      <div key={c.id} className="flex items-center gap-2">
                        <ColorSwatch hex={c.hex} alpha={c.alpha} size="sm" />
                        <span className="flex-1 text-xs font-mono text-text-secondary">{c.hex}</span>
                        {c.name && <span className="text-xs text-text-muted truncate max-w-[80px]">{c.name}</span>}
                        <button
                          type="button"
                          onClick={() => setInputValue(c.hex)}
                          className={[
                            'px-2 py-0.5 text-xs rounded border transition-colors',
                            isBase
                              ? 'border-accent bg-accent text-white'
                              : 'border-border text-text-muted hover:border-accent hover:text-accent',
                          ].join(' ')}
                        >
                          ベース
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubInputValue(c.hex)}
                          className={[
                            'px-2 py-0.5 text-xs rounded border transition-colors',
                            isSub
                              ? 'border-accent bg-accent text-white'
                              : 'border-border text-text-muted hover:border-accent hover:text-accent',
                          ].join(' ')}
                        >
                          サブ
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- 複数色モード ---- */}
        {mode === 'multi' && (
          <div className="space-y-3">
            <div className="bg-surface-raised rounded-xl p-4 space-y-2.5">
              <p className="text-xs text-text-muted font-medium">起点色（2〜6色）</p>
              {multiInputs.map((hex, index) => (
                <div key={index} className="flex items-center gap-2">
                  {/* 色丸ピッカー */}
                  <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-border cursor-pointer">
                    <div className="absolute inset-0 rounded-full" style={{ backgroundColor: isValidHex(hex) ? hex : '#888' }} />
                    <input
                      type="color"
                      value={isValidHex(hex) ? hex : '#888888'}
                      onChange={(e) => {
                        const next = [...multiInputs]
                        next[index] = e.target.value.toUpperCase()
                        setMultiInputs(next)
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  {/* HEX入力 */}
                  <input
                    type="text"
                    value={hex}
                    onChange={(e) => {
                      const next = [...multiInputs]
                      next[index] = e.target.value.toUpperCase()
                      setMultiInputs(next)
                    }}
                    placeholder="#RRGGBB"
                    maxLength={7}
                    className={[
                      'flex-1 bg-surface-overlay border rounded px-2.5 py-1.5 text-xs font-mono text-text-primary focus:outline-none transition-colors',
                      isValidHex(hex) ? 'border-border focus:border-accent' : 'border-red-500/60',
                    ].join(' ')}
                  />
                  {/* 削除ボタン（3色以上のときのみ） */}
                  {multiInputs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setMultiInputs(multiInputs.filter((_, i) => i !== index))}
                      className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors flex-shrink-0 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {/* +色を追加 ボタン */}
              {multiInputs.length < 6 && (
                <button
                  type="button"
                  onClick={() => setMultiInputs([...multiInputs, '#888888'])}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-border text-xs text-text-muted hover:text-text-secondary hover:border-text-muted transition-colors"
                >
                  <span>＋</span>
                  <span>色を追加</span>
                </button>
              )}
            </div>

            {/* パターン選択 */}
            <div className="space-y-2">
              <p className="text-xs text-text-muted">パターン</p>
              <div className="flex gap-2">
                {(Object.keys(MULTI_PATTERN_LABELS) as MultiColorPattern[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setMultiPattern(p)}
                    className={[
                      'flex-1 py-2 text-xs rounded-lg border transition-colors',
                      multiPattern === p
                        ? 'bg-accent border-accent text-white'
                        : 'bg-surface-raised border-border text-text-secondary hover:border-accent/50 hover:text-text-primary',
                    ].join(' ')}
                  >
                    {MULTI_PATTERN_LABELS[p]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-muted">
                {multiPattern === 'harmony' && '起点色の平均色相を中心に類似色を加えた調和パレット'}
                {multiPattern === 'contrast' && '各起点色に補色を加えたコントラストパレット'}
                {multiPattern === 'blend' && '起点色を色相順にソートし補間した連続グラデーション'}
              </p>
            </div>
          </div>
        )}

        {/* 生成結果 */}
        {generatedColors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs text-text-muted">
                  {mode === 'bridge' ? `2色ブリッジ（${generatedColors.length}色）`
                    : mode === 'multi' ? `${MULTI_PATTERN_LABELS[multiPattern]}（${generatedColors.length}色）`
                    : `生成結果（${generatedColors.length}色）`}
                </p>
                {isPendingConfirm && mode === 'single' && (
                  <span className="text-xs bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">プレビュー</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendToPreview}
                  className="px-3 py-1 text-xs border border-border text-text-muted hover:text-text-primary hover:border-accent/50 rounded-lg transition-colors"
                  title="生成した色をWebプレビューに送って確認"
                >
                  Web プレビュー ↗
                </button>
                {/* 1色モード: 確定フロー / それ以外: すべて保存 */}
                {mode === 'single' ? (
                  <div className="flex items-center gap-1.5">
                    {isPendingConfirm && (
                      <button
                        type="button"
                        onClick={handleCancelPreview}
                        className="px-3 py-1 text-xs border border-border text-text-muted hover:text-text-primary hover:border-text-muted rounded-lg transition-colors"
                      >
                        キャンセル
                      </button>
                    )}
                    <button
                      onClick={handleConfirm}
                      disabled={savingAll}
                      type="button"
                      className="px-3 py-1 text-xs bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      {savingAll ? '保存中...' : isPendingConfirm ? 'この組み合わせを使う' : 'すべて保存'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSaveAll}
                    disabled={savingAll}
                    type="button"
                    className="px-3 py-1 text-xs bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {savingAll ? '保存中...' : 'すべて保存'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-surface-raised rounded-xl overflow-hidden divide-y divide-border/50">
              {generatedColors.map((hex, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-2.5">
                  <ColorSwatch hex={hex} alpha={1} size="sm" />
                  <span className="flex-1 text-sm font-mono text-text-primary">{hex}</span>
                  {/* ラベル */}
                  {isTwoColorMode && index === 0 && (
                    <span className="text-xs text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded">ベース</span>
                  )}
                  {isTwoColorMode && index === generatedColors.length - 1 && (
                    <span className="text-xs text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded">サブ</span>
                  )}
                  {!isTwoColorMode && index === 0 && activeScheme !== 'analogous' && (
                    <span className="text-xs text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded">ベース</span>
                  )}
                  {!isTwoColorMode && activeScheme === 'analogous' && index === 1 && (
                    <span className="text-xs text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded">ベース</span>
                  )}
                  {/* 割合スライダー */}
                  <input
                    type="range"
                    min={5}
                    max={80}
                    value={ratios[index] ?? DEFAULT_RATIOS[index] ?? 5}
                    onChange={(e) => handleRatioChange(index, parseInt(e.target.value))}
                    className="w-14 h-1 cursor-pointer"
                  />
                  <span className="text-xs text-text-muted font-mono w-7 text-right flex-shrink-0">
                    {ratios[index] ?? DEFAULT_RATIOS[index] ?? 5}%
                  </span>
                  <button
                    onClick={() => handleSaveOne(hex, index)}
                    disabled={savingIndex === index}
                    type="button"
                    className="text-xs text-text-muted hover:text-text-primary disabled:opacity-50 px-2 py-1 hover:bg-surface-overlay rounded transition-colors flex-shrink-0"
                  >
                    {savingIndex === index ? '...' : '保存'}
                  </button>
                </div>
              ))}
            </div>

            {/* カラーバー */}
            <div className="flex rounded-lg overflow-hidden h-7">
              {generatedColors.map((hex, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: hex,
                    flex: ratios[index] ?? DEFAULT_RATIOS[index] ?? 1,
                    transition: 'background-color 80ms ease, flex 150ms ease',
                  }}
                  title={`${hex} ${ratios[index] ?? DEFAULT_RATIOS[index] ?? 5}%`}
                />
              ))}
            </div>
          </div>
        )}

        {/* 空状態 */}
        {generatedColors.length === 0 && (
          <Center className="py-12 text-text-muted text-sm">
            {mode === 'bridge' && !isSubValid
              ? 'サブ色を入力してください'
              : mode === 'multi'
              ? '有効な HEX カラーコードを2色以上入力してください'
              : '有効な HEX カラーコードを入力してください'}
          </Center>
        )}
      </div>
    </div>
  )
}

// ---- 色相スライダー ----

/**
 * 現在の色の Saturation / Lightness を維持したまま、色相（Hue）だけを変えるスライダー。
 * トラックは虹色グラデーション（その色の S/L で固定）。
 */
function HueSlider({ hex, onChange }: { hex: string; onChange: (hex: string) => void }) {
  const [h, s, l] = hexToHsl(hex)

  // トラック用グラデーション：同じ S/L で H を 0〜360 変化
  const gradientStops = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
    .map((deg) => hslToHex(deg, s, l))
    .join(', ')

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">色相</span>
        <span className="text-xs font-mono text-text-muted">{h}°</span>
      </div>
      <div className="relative h-4 flex items-center">
        {/* カラフルなトラック */}
        <div
          className="absolute inset-x-0 h-2 rounded-full"
          style={{ background: `linear-gradient(to right, ${gradientStops})` }}
        />
        {/* サムの影用リング */}
        <input
          type="range"
          min={0}
          max={359}
          value={h}
          onChange={(e) => {
            const newHue = parseInt(e.target.value)
            onChange(hslToHex(newHue, s, l))
          }}
          className="relative w-full h-2 appearance-none bg-transparent cursor-pointer hue-slider"
          style={{ zIndex: 1 }}
        />
      </div>
    </div>
  )
}

// ---- 色入力スロット（2色モード用） ----

function ColorInputSlot({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const valid = isValidHex(value)
  return (
    <div className="flex-1 bg-surface-raised rounded-xl p-3 space-y-2">
      <p className="text-xs text-text-muted font-medium">{label}</p>
      <div className="flex items-center gap-2">
        {/* 色丸（カラーピッカー） */}
        <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-border cursor-pointer">
          <div className="absolute inset-0 rounded-full" style={{ backgroundColor: valid ? value : '#888' }} />
          <input
            type="color"
            value={valid ? value : '#888888'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        {/* HEX テキスト */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="#RRGGBB"
          maxLength={7}
          className={[
            'flex-1 w-0 bg-surface-overlay border rounded px-2 py-1.5 text-xs font-mono text-text-primary focus:outline-none transition-colors',
            valid ? 'border-border focus:border-accent' : 'border-red-500/60',
          ].join(' ')}
        />
      </div>
    </div>
  )
}
