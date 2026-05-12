# Step 8: 印刷補助（TAC値チェック・色域警告・cmyk_source）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DetailPanel に CMYK 手動入力欄を追加し、TAC 値（総インク量）チェックと色域警告（ガマット警告）を表示する。

**Current state:** DetailPanel は `color.c/m/y/k` が null でない場合のみ表示専用で CMYK を表示する。入力欄なし。`colorStore.updateColor` は `c/m/y/k/cmyk_source` を含む `ColorUpdate` を受け入れる。`CmykSource` 型は `database.ts` で定義済み。

**Architecture:**
- `src/lib/printUtils.ts` — TAC 計算、ガマット警告判定ロジック（純粋関数）
- `src/components/detail/DetailPanel.tsx` — CMYK 入力欄（4 inputs + 保存ボタン）+ TAC 警告バッジ + ガマット警告 + cmyk_source ラベル

---

## ファイル構成

```
src/
├── lib/
│   └── printUtils.ts         # 新規：TAC計算・ガマット警告判定
└── components/
    └── detail/
        └── DetailPanel.tsx   # 修正：CMYK手動入力欄・TAC警告・ガマット警告追加
```

---

### Task 1: src/lib/printUtils.ts を作成する

**Files:**
- Create: `src/lib/printUtils.ts`

- [ ] **Step 1: printUtils.ts を作成する**

```typescript
// src/lib/printUtils.ts
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
```

- [ ] **Step 2: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && cd /Users/yutashimizu/Projects/apps/colorpicker && npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミットする**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && git add src/lib/printUtils.ts && git commit -m "feat: add printUtils with TAC calculation and gamut warning"
```

---

### Task 2: DetailPanel に CMYK 手動入力欄を追加する

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`

**Current state の確認:**
- CMYK セクション（213〜225行）は `color.c != null || color.m != null` のとき表示専用で値を表示するだけ
- `useState` / `useColorStore` / `useUIStore` は既にインポート済み

- [ ] **Step 1: DetailPanel.tsx を完全版に差し替える**

```typescript
// src/components/detail/DetailPanel.tsx
import { useState } from 'react'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { IconButton } from '@/components/ui/IconButton'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { calcTAC, isTACWarning, isOutOfGamut, cmykSourceLabel } from '@/lib/printUtils'
import type { Color } from '@/types/database'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  h = Math.round(h * 60 + (h < 0 ? 360 : 0))
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) }
}

function formatColor(color: Color, format: string): string {
  const { r, g, b } = hexToRgb(color.hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  const a = color.alpha
  switch (format) {
    case 'HEX': return color.hex
    case 'RGB': return `rgb(${r}, ${g}, ${b})`
    case 'RGBA': return `rgba(${r}, ${g}, ${b}, ${a})`
    case 'HSL': return `hsl(${h}, ${s}%, ${l}%)`
    case 'HSLA': return `hsla(${h}, ${s}%, ${l}%, ${a})`
    case 'CMYK': {
      if (color.c != null && color.m != null && color.y != null && color.k != null) {
        return `C${Math.round(color.c)} M${Math.round(color.m)} Y${Math.round(color.y)} K${Math.round(color.k)}`
      }
      return '未入力'
    }
    default: return color.hex
  }
}

function FormatRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    onCopy()
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-text-muted w-10 flex-shrink-0">{label}</span>
      <span className="flex-1 text-xs text-text-secondary font-mono truncate">{value}</span>
      <button onClick={handleCopy} type="button" className="text-xs text-text-muted hover:text-text-primary transition-colors flex-shrink-0">
        {copied ? '✓' : '⎘'}
      </button>
    </div>
  )
}

interface CmykDraft {
  c: number
  m: number
  y: number
  k: number
}

interface DetailPanelProps {
  color: Color | null
}

export function DetailPanel({ color }: DetailPanelProps) {
  const { setSelectedColorId, setIsDetailPanelOpen } = useUIStore()
  const { updateColor, incrementUsedCount } = useColorStore()
  const [bgMode, setBgMode] = useState<'dark' | 'light'>('dark')
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [isEditingMemo, setIsEditingMemo] = useState(false)
  const [memoValue, setMemoValue] = useState('')
  const [cmykDraft, setCmykDraft] = useState<CmykDraft>({ c: 0, m: 0, y: 0, k: 0 })
  const [isEditingCmyk, setIsEditingCmyk] = useState(false)

  const handleClose = () => {
    setSelectedColorId(null)
    setIsDetailPanelOpen(false)
  }

  const handleNameSubmit = () => {
    if (!color) return
    if (nameValue.trim() !== color.name) {
      updateColor(color.id, { name: nameValue.trim() })
    }
    setIsEditingName(false)
  }

  const handleMemoSubmit = () => {
    if (!color) return
    updateColor(color.id, { memo: memoValue.trim() || null })
    setIsEditingMemo(false)
  }

  const handleCmykEdit = () => {
    if (!color) return
    setCmykDraft({
      c: color.c ?? 0,
      m: color.m ?? 0,
      y: color.y ?? 0,
      k: color.k ?? 0,
    })
    setIsEditingCmyk(true)
  }

  const handleCmykSave = () => {
    if (!color) return
    // 各チャンネルを 0〜100 にクランプ
    const clamped: CmykDraft = {
      c: Math.min(100, Math.max(0, cmykDraft.c)),
      m: Math.min(100, Math.max(0, cmykDraft.m)),
      y: Math.min(100, Math.max(0, cmykDraft.y)),
      k: Math.min(100, Math.max(0, cmykDraft.k)),
    }
    updateColor(color.id, { ...clamped, cmyk_source: 'manual' })
    setIsEditingCmyk(false)
  }

  const handleCmykCancel = () => {
    setIsEditingCmyk(false)
  }

  const handleCmykChannelChange = (channel: keyof CmykDraft, value: string) => {
    const num = parseInt(value, 10)
    setCmykDraft((prev) => ({ ...prev, [channel]: isNaN(num) ? 0 : num }))
  }

  if (!color) return null

  const FORMATS = ['HEX', 'RGB', 'RGBA', 'HSL', 'HSLA', 'CMYK']

  // TAC・ガマット警告の計算
  const hasCmyk = color.c != null && color.m != null && color.y != null && color.k != null
  const tac = hasCmyk ? calcTAC(color.c!, color.m!, color.y!, color.k!) : null
  const tacWarning = tac !== null ? isTACWarning(tac) : false
  const gamutWarning = isOutOfGamut(color.hex)
  const sourceLabel = cmykSourceLabel(color.cmyk_source)

  // CMYK 入力中の TAC プレビュー
  const draftTac = isEditingCmyk ? calcTAC(cmykDraft.c, cmykDraft.m, cmykDraft.y, cmykDraft.k) : null
  const draftTacWarning = draftTac !== null ? isTACWarning(draftTac) : false

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-l border-border bg-surface overflow-y-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">詳細</span>
          {/* お気に入り */}
          <IconButton
            onClick={() => updateColor(color.id, { is_favorite: !color.is_favorite })}
            active={color.is_favorite}
            title={color.is_favorite ? 'お気に入り解除' : 'お気に入り'}
          >
            {color.is_favorite ? '★' : '☆'}
          </IconButton>
          {/* ロック */}
          <IconButton
            onClick={() => updateColor(color.id, { is_locked: !color.is_locked })}
            active={color.is_locked}
            title={color.is_locked ? 'ロック解除' : 'ロックする'}
          >
            {color.is_locked ? '🔒' : '🔓'}
          </IconButton>
          {/* アーカイブ */}
          <IconButton
            onClick={() => updateColor(color.id, { is_archived: !color.is_archived })}
            title={color.is_archived ? 'アーカイブ解除' : 'アーカイブ'}
          >
            {color.is_archived ? '📤' : '📥'}
          </IconButton>
        </div>
        <IconButton onClick={handleClose} title="閉じる">✕</IconButton>
      </div>

      {/* 丸アイコン + 背景切り替え */}
      <div
        className="flex items-center justify-center py-8 relative transition-colors"
        style={{ backgroundColor: bgMode === 'dark' ? '#111' : '#f5f5f5' }}
      >
        <ColorSwatch hex={color.hex} alpha={color.alpha} size="lg" />
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button onClick={() => setBgMode('dark')} type="button" className={['w-5 h-5 rounded-full bg-black border transition-all', bgMode === 'dark' ? 'border-accent scale-110' : 'border-border'].join(' ')} />
          <button onClick={() => setBgMode('light')} type="button" className={['w-5 h-5 rounded-full bg-white border transition-all', bgMode === 'light' ? 'border-accent scale-110' : 'border-border'].join(' ')} />
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-4">
        {/* 色名（クリックで編集） */}
        <div>
          {isEditingName ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameSubmit(); if (e.key === 'Escape') setIsEditingName(false) }}
              autoFocus
              className="w-full bg-surface-overlay border border-accent rounded px-2 py-1 text-base font-medium text-text-primary focus:outline-none"
            />
          ) : (
            <button
              onClick={() => { if (!color.is_locked) { setNameValue(color.name); setIsEditingName(true) } }}
              type="button"
              className="text-base font-medium text-text-primary hover:text-accent transition-colors text-left w-full truncate disabled:cursor-not-allowed"
              title={color.is_locked ? 'ロック中のため編集できません' : 'クリックして編集'}
            >
              {color.name || color.hex}
            </button>
          )}
        </div>

        {/* カラーコード */}
        <div>
          <p className="text-xs text-text-muted mb-2">カラーコード</p>
          <div className="bg-surface-raised rounded-lg px-3 py-1">
            {FORMATS.map((fmt) => (
              <FormatRow
                key={fmt}
                label={fmt}
                value={formatColor(color, fmt)}
                onCopy={() => incrementUsedCount(color.id)}
              />
            ))}
          </div>
        </div>

        {/* 透明度 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-text-muted">透明度</p>
            <p className="text-xs text-text-secondary font-mono">{Math.round(color.alpha * 100)}%</p>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(color.alpha * 100)}
            onChange={(e) => {
              if (!color.is_locked) {
                updateColor(color.id, { alpha: parseInt(e.target.value) / 100 })
              }
            }}
            disabled={color.is_locked}
            className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* ガマット警告 */}
        {gamutWarning && (
          <div className="flex items-start gap-2 px-2.5 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <span className="text-yellow-400 text-xs flex-shrink-0 mt-0.5">⚠</span>
            <p className="text-xs text-yellow-300 leading-snug">
              この色はCMYK印刷で正確に再現できない可能性があります（色域外）
            </p>
          </div>
        )}

        {/* CMYK（手動入力） */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-text-muted">CMYK（印刷用）</p>
            {sourceLabel && (
              <span className="text-xs text-text-muted bg-surface-raised px-1.5 py-0.5 rounded">{sourceLabel}</span>
            )}
          </div>

          {isEditingCmyk ? (
            <div className="space-y-2">
              {/* 入力フィールド */}
              <div className="grid grid-cols-4 gap-1.5">
                {(['c', 'm', 'y', 'k'] as const).map((ch) => (
                  <div key={ch} className="flex flex-col items-center gap-1">
                    <label className="text-xs text-text-muted uppercase">{ch}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={cmykDraft[ch]}
                      onChange={(e) => handleCmykChannelChange(ch, e.target.value)}
                      className="w-full text-center text-xs font-mono bg-surface-overlay border border-border rounded px-1 py-1 text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
              {/* 入力中 TAC プレビュー */}
              <div className={['flex items-center justify-between px-2 py-1 rounded text-xs', draftTacWarning ? 'bg-red-500/10 border border-red-500/30' : 'bg-surface-raised'].join(' ')}>
                <span className="text-text-muted">TAC合計</span>
                <span className={['font-mono font-medium', draftTacWarning ? 'text-red-400' : 'text-text-secondary'].join(' ')}>
                  {draftTac}%{draftTacWarning ? ' ⚠ 上限超過' : ''}
                </span>
              </div>
              {/* 操作ボタン */}
              <div className="flex gap-1.5">
                <button
                  onClick={handleCmykSave}
                  type="button"
                  className="flex-1 py-1 bg-accent hover:bg-accent-hover text-white text-xs rounded transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={handleCmykCancel}
                  type="button"
                  className="flex-1 py-1 bg-surface-raised hover:bg-surface-overlay text-text-secondary text-xs rounded transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 表示モード */}
              <div className="grid grid-cols-4 gap-1.5">
                {(['c', 'm', 'y', 'k'] as const).map((ch) => (
                  <div key={ch} className="text-center">
                    <p className="text-xs text-text-muted uppercase">{ch}</p>
                    <p className="text-sm font-mono text-text-primary">
                      {color[ch] != null ? Math.round(color[ch]!) : '—'}
                    </p>
                  </div>
                ))}
              </div>
              {/* TAC 表示（保存済み値がある場合） */}
              {hasCmyk && tac !== null && (
                <div className={['flex items-center justify-between px-2 py-1 rounded text-xs', tacWarning ? 'bg-red-500/10 border border-red-500/30' : 'bg-surface-raised'].join(' ')}>
                  <span className="text-text-muted">TAC合計</span>
                  <span className={['font-mono font-medium', tacWarning ? 'text-red-400' : 'text-text-secondary'].join(' ')}>
                    {Math.round(tac)}%{tacWarning ? ' ⚠ 上限超過' : ''}
                  </span>
                </div>
              )}
              {/* 編集ボタン */}
              {!color.is_locked && (
                <button
                  onClick={handleCmykEdit}
                  type="button"
                  className="w-full py-1 text-xs text-text-muted hover:text-text-primary bg-surface-raised hover:bg-surface-overlay rounded transition-colors"
                >
                  {hasCmyk ? 'CMYK を編集' : 'CMYK を入力'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 特色メモ */}
        {color.spot_color && (
          <div>
            <p className="text-xs text-text-muted mb-1">特色メモ</p>
            <p className="text-sm text-text-secondary">{color.spot_color}</p>
          </div>
        )}

        {/* 一言メモ（クリックで編集） */}
        <div>
          <p className="text-xs text-text-muted mb-1">メモ</p>
          {isEditingMemo ? (
            <textarea
              value={memoValue}
              onChange={(e) => setMemoValue(e.target.value)}
              onBlur={handleMemoSubmit}
              onKeyDown={(e) => { if (e.key === 'Escape') setIsEditingMemo(false) }}
              autoFocus
              rows={3}
              className="w-full bg-surface-overlay border border-accent rounded px-2 py-1 text-sm text-text-primary focus:outline-none resize-none"
            />
          ) : (
            <button
              onClick={() => { if (!color.is_locked) { setMemoValue(color.memo ?? ''); setIsEditingMemo(true) } }}
              type="button"
              className="w-full text-left text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {color.memo || <span className="text-text-muted">クリックしてメモを追加...</span>}
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && cd /Users/yutashimizu/Projects/apps/colorpicker && npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミットする**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && git add src/components/detail/DetailPanel.tsx && git commit -m "feat: add CMYK manual input, TAC warning, and gamut warning to DetailPanel"
```

---

## 動作確認チェックリスト

- [ ] 詳細パネルを開くと「CMYK を入力」ボタンが表示される
- [ ] ボタンをクリックすると C/M/Y/K の 4 つの数値入力欄が展開される
- [ ] 入力中に TAC 合計がリアルタイムで更新される
- [ ] TAC が 320% を超えると赤バッジ「⚠ 上限超過」が表示される
- [ ] 保存ボタンを押すと Supabase に c/m/y/k/cmyk_source='manual' が保存される
- [ ] 保存後に「手動入力」ラベルが表示される
- [ ] 既存の CMYK 値がある場合は「CMYK を編集」と表示される
- [ ] ロック中の色は編集ボタンが表示されない
- [ ] 鮮やかな RGB 色（例: #FF0080）でガマット警告が表示される
- [ ] 地味な色（例: #808080）ではガマット警告が出ない

---

## 設計メモ

**TAC 上限について:** デフォルト 320% は一般的なコート紙オフセット印刷の上限。新聞紙（240%）など用途によって異なるが、UI では現状 320% 固定で警告する。将来的に設定画面から変更できるよう `isTACWarning(tac, limit)` の第 2 引数で上限を渡せる設計にしている。

**ガマット警告の精度について:** ICC プロファイルを使った厳密な色域変換は実装コストが高いため、RGB チャンネル値の簡易ヒューリスティックで代替する。実際の印刷現場での参考値として使用し、最終判断は DTP ソフトに委ねる旨をヘルプで明記することを推奨する。

**cmyk_source の使い分け:**
- `manual` — ユーザーが DetailPanel から直接入力した値
- `converted` — 将来の自動変換機能が設定する値（現在は未実装）
- `print_spec` — 将来の印刷仕様インポート機能が設定する値（現在は未実装）
