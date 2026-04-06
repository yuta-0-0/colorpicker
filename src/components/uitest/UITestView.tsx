import { useState } from 'react'
import { useUITestStore } from '@/store/uiTestStore'
import { useColorStore } from '@/store/colorStore'
import { isValidHex } from '@/lib/colorUtils'
import type { Color } from '@/types/database'

export function UITestView() {
  const { slots, setSlotHex, isActive, applyToUI, resetUI } = useUITestStore()
  const { colors } = useColorStore()

  return (
    <div className="flex-1 overflow-y-auto">
      {/* 適用中バナー */}
      {isActive && (
        <div className="bg-accent/10 border-b border-accent/30 px-4 py-2 flex items-center justify-between">
          <p className="text-xs text-accent font-medium">UIテストモード適用中 — アプリ全体のアクセントカラーが変更されています</p>
          <button
            type="button"
            onClick={resetUI}
            className="text-xs text-accent hover:text-accent/70 underline transition-colors"
          >
            リセット
          </button>
        </div>
      )}

      <div className="p-6">
        <div className="max-w-lg mx-auto space-y-6">
          {/* ヘッダー */}
          <div>
            <h2 className="text-base font-medium text-text-primary mb-0.5">UIテストモード</h2>
            <p className="text-xs text-text-muted">4色のパレットを設定してアプリUIに反映できます。カラージェネレーターの「UIテスト ↗」からも送れます。</p>
          </div>

          {/* 4スロット */}
          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot, i) => (
              <SlotCard
                key={slot.label}
                index={i as 0 | 1 | 2 | 3}
                label={slot.label}
                hex={slot.hex}
                onChange={(hex) => setSlotHex(i as 0 | 1 | 2 | 3, hex)}
                colors={colors}
                isMain={i === 0}
              />
            ))}
          </div>

          {/* 配色バー */}
          <div>
            <p className="text-xs text-text-muted mb-1.5">配色プレビュー</p>
            <div className="flex rounded-lg overflow-hidden h-8 border border-border/30">
              {slots.map((slot) => (
                <div
                  key={slot.label}
                  className="flex-1"
                  style={{ backgroundColor: isValidHex(slot.hex) ? slot.hex : '#888' }}
                  title={`${slot.label}: ${slot.hex}`}
                />
              ))}
            </div>
            <div className="flex mt-1">
              {slots.map((slot) => (
                <div key={slot.label} className="flex-1 text-center">
                  <p className="text-xs text-text-muted">{slot.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* UIモックプレビュー（Tailwindクラスで描画 → CSS変数適用後に即反映） */}
          <div className="bg-surface-raised rounded-xl p-4 space-y-3">
            <p className="text-xs text-text-muted mb-2">UIプレビュー（適用後はここも変わります）</p>

            {/* ボタン類 */}
            <div className="flex gap-2 flex-wrap items-center">
              <button type="button" className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium">
                保存する
              </button>
              <button type="button" className="px-4 py-1.5 rounded-lg border border-accent text-accent text-sm font-medium">
                キャンセル
              </button>
              <button type="button" className="px-3 py-1.5 rounded-lg bg-surface-overlay border border-border text-text-secondary text-sm">
                その他
              </button>
            </div>

            {/* アクティブ状態 */}
            <div className="flex gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs">アクティブタグ</span>
              <span className="px-2.5 py-1 rounded-full bg-surface-overlay border border-border text-text-secondary text-xs">通常タグ</span>
            </div>

            {/* フォーム行 */}
            <div className="flex items-center gap-2 py-2 border-b border-accent/30">
              <span className="text-xs text-text-muted w-10">HEX</span>
              <span className="flex-1 text-xs font-mono text-text-primary">
                {isValidHex(slots[0].hex) ? slots[0].hex : '#3B82F6'}
              </span>
              <button type="button" className="text-xs text-accent hover:text-accent/70 transition-colors">⎘</button>
            </div>

            {/* チェックボックス風 */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-accent flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs text-text-primary">選択中アイテム</span>
            </div>
          </div>

          {/* 適用ボタン */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyToUI}
              className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
            >
              {isActive ? 'メイン色を再適用' : 'メイン色をUIに適用'}
            </button>
            <button
              type="button"
              onClick={resetUI}
              disabled={!isActive}
              className="flex-1 py-2.5 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-border text-sm text-text-secondary disabled:opacity-40 transition-colors"
            >
              デフォルトに戻す
            </button>
          </div>

          <p className="text-xs text-text-muted text-center">
            メイン色のみUIに反映されます。サポート・アクセント・オプションは配色の参考用です。
          </p>
        </div>
      </div>
    </div>
  )
}

// ---- スロットカード ----

interface SlotCardProps {
  index: 0 | 1 | 2 | 3
  label: string
  hex: string
  onChange: (hex: string) => void
  colors: Color[]
  isMain: boolean
}

function SlotCard({ label, hex, onChange, colors, isMain }: SlotCardProps) {
  const [showCollection, setShowCollection] = useState(false)
  const valid = isValidHex(hex)

  return (
    <div className={['rounded-xl p-3 space-y-2.5 border', isMain ? 'bg-surface-raised border-accent/30' : 'bg-surface-raised border-border'].join(' ')}>
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-text-primary">{label}</p>
          {isMain && <span className="text-xs text-accent bg-accent/10 px-1.5 rounded">UI適用</span>}
        </div>
        <button
          type="button"
          onClick={() => setShowCollection((v) => !v)}
          className={['text-xs px-1.5 py-0.5 rounded transition-colors', showCollection ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-secondary hover:bg-surface-overlay'].join(' ')}
          title="コレクションから選ぶ"
        >
          コレクション
        </button>
      </div>

      {/* 色サークル + HEX入力 */}
      <div className="flex items-center gap-2">
        <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-border cursor-pointer"
          style={{ borderColor: valid ? hex : undefined }}>
          <div className="absolute inset-0" style={{ backgroundColor: valid ? hex : '#888' }} />
          <input
            type="color"
            value={valid ? hex : '#888888'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title="カラーピッカー"
          />
        </div>
        <input
          type="text"
          value={hex}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          maxLength={7}
          className={[
            'flex-1 w-0 bg-surface-overlay border rounded px-2 py-1.5 text-xs font-mono text-text-primary focus:outline-none',
            valid ? 'border-border focus:border-accent' : 'border-red-500/60',
          ].join(' ')}
        />
      </div>

      {/* コレクション選択 */}
      {showCollection && (
        <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-border/40 max-h-20 overflow-y-auto">
          {colors.filter((c) => !c.is_archived).length === 0 ? (
            <p className="text-xs text-text-muted">色がありません</p>
          ) : (
            colors.filter((c) => !c.is_archived).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.hex); setShowCollection(false) }}
                title={`${c.name ?? c.hex}`}
                className={[
                  'w-6 h-6 rounded-full transition-transform hover:scale-110 flex-shrink-0',
                  hex === c.hex ? 'ring-selection' : '',
                ].join(' ')}
                style={{ backgroundColor: c.hex }}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
