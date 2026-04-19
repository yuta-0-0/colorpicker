# Filter/Sort Overhaul 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ギャラリービューにFilterBarのフィルター・ソートを反映し、色相ソートの赤折り返し問題を修正し、トーンをソートからフィルターに格上げする。

**Architecture:** GalleryView の内部ソートを除去して AppLayout の `displayColors` をそのまま使う。`getHue()` を修正して赤(340-360°)を先頭グループに正規化・無彩色を末尾に送る。`sortBy` から `'tone'` を除去し `activeToneFilter` を uiStore に追加、FilterBar にトーン5ボタンを追加、AppLayout のフィルターパイプラインに Step 6 として組み込む。

**Tech Stack:** React, TypeScript, Tailwind CSS v3, Zustand

---

## ファイル変更マップ

| ファイル | 変更内容 |
|---|---|
| `src/components/views/GalleryView.tsx` | 内部 `getHue` 関数・内部ソートを除去 |
| `src/components/layout/AppLayout.tsx` | `getHue()` 正規化修正・`getTone()` 追加・トーンフィルター Step 6 追加・トーンソート除去 |
| `src/components/views/ListView.tsx` | 色相ソート時のグループヘッダー除去（フラット表示へ） |
| `src/store/uiStore.ts` | `activeToneFilter: ToneCategory \| null`・`setActiveToneFilter` 追加・`sortBy` から `'tone'` 除去 |
| `src/components/views/FilterBar.tsx` | トーンフィルター5ボタン追加・「トーン順」ソートオプション除去 |

---

## Task 1: GalleryView — 内部ソート除去

**Files:**
- Modify: `src/components/views/GalleryView.tsx`

---

- [ ] **Step 1: `GalleryView.tsx` を読む**

`src/components/views/GalleryView.tsx` を読んで現在の構造を把握する。

- [ ] **Step 2: 内部 `getHue` 関数と内部ソートを除去する**

`GalleryView.tsx` の先頭にある `getHue` 関数（行 5-16）を丸ごと削除する。

`visibleColors` の計算から `.slice().sort(...)` を除去し、アーカイブフィルターのみ残す：

```tsx
// 変更前
const visibleColors = (showArchived ? colors : colors.filter((c) => !c.is_archived))
  .slice().sort((a, b) => getHue(a.hex) - getHue(b.hex))

// 変更後
const visibleColors = showArchived ? colors : colors.filter((c) => !c.is_archived)
```

- [ ] **Step 3: type-check を実行する**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npm run type-check
```

エラーなしで完了することを確認する。

- [ ] **Step 4: コミット**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker
git add src/components/views/GalleryView.tsx
git commit -m "fix: GalleryView now uses displayColors from AppLayout instead of re-sorting internally"
```

---

## Task 2: 色相ソート正規化 + ListView グループヘッダー除去

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/components/views/ListView.tsx`

---

- [ ] **Step 1: AppLayout.tsx の `getHue()` を読む**

`src/components/layout/AppLayout.tsx` の `getHue` 関数（行 205-217 付近）を確認する。

- [ ] **Step 2: `getHue()` を正規化版に書き換える**

AppLayout.tsx の `getHue` 関数を以下に完全置換する：

```ts
function getHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))

  // 無彩色（彩度 12% 未満）→ 末尾: 白(800) / グレー(700) / 黒(900)
  if (s < 0.12) {
    if (l > 0.85) return 800  // 白
    if (l < 0.25) return 900  // 黒
    return 700                // グレー
  }

  // 有彩色: HSL 色相を計算
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = Math.round(h * 60 + (h < 0 ? 360 : 0))

  // 赤の折り返し正規化: hue 340-360 を -20〜0 にマップして赤グループを先頭に統一
  return h >= 340 ? h - 360 : h
}
```

ソート順（昇順）: 赤(-20〜20) → 橙(20-45) → 黄(45-70) → 緑(70-160) → 青(160-250) → 紫(250-290) → ピンク(290-340) → グレー(700) → 白(800) → 黒(900)

- [ ] **Step 3: ListView.tsx のヘッダーレンダリングを読む**

`src/components/views/ListView.tsx` の `sortBy === 'hue'` 分岐（行 200-260 付近）を確認する。現在は色相カテゴリごとにグループヘッダーを表示している。

- [ ] **Step 4: ListView の色相ソート表示をフラット化する**

`sortBy !== 'order'` のブロックを以下のように変更する。色相ソート時のグループヘッダー表示を除去し、すべての非追加順ソートを同じフラット表示にする：

```tsx
// 変更前: sortBy !== 'order' の中に sortBy === 'hue' の特別分岐がある
// 変更後: 全非order ソートを同じフラット表示に統一

// sortBy !== 'order' ブロック全体を以下に置換する:
if (sortBy !== 'order') {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-0.5 p-2">
        {visibleColors.map((color, index) => {
          const isChecked = bulkSelectedIds.includes(color.id)
          return (
            <div key={color.id} className="flex items-center">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleBulkSelect(color.id) }}
                className={[
                  'flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-opacity mr-0.5',
                  isBulkMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  isChecked
                    ? 'bg-accent text-white'
                    : 'bg-surface-overlay border border-border text-transparent',
                ].join(' ')}
                title="選択"
              >
                {isChecked && (
                  <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <ColorListItem
                key={color.id}
                color={color}
                isSelected={selectedColorId === color.id}
                onSelect={(e) => handleSelect(color, index, e)}
                onCopy={(e) => handleCopy(color, e)}
                onToggleFavorite={(e) => handleToggleFavorite(color, e)}
                onDelete={(e) => handleDelete(color, e)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**注意:** 既存の `sortBy !== 'order'` ブロック内の実装をよく読んで、実際のコンポーネントの props・ハンドラ名に合わせること。コードは既存の flat 表示パターン（`sortBy === 'used_count'` や `sortBy === 'tone'` の場合）を参考にそのままコピーして `sortBy === 'hue'` 分岐を削除するだけでよい。

- [ ] **Step 5: type-check を実行する**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npm run type-check
```

- [ ] **Step 6: コミット**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker
git add src/components/layout/AppLayout.tsx src/components/views/ListView.tsx
git commit -m "fix: normalize hue sort order and remove hue group headers in list view"
```

---

## Task 3: トーンフィルター実装（ソートから格上げ）

**Files:**
- Modify: `src/store/uiStore.ts`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/components/views/FilterBar.tsx`

---

- [ ] **Step 1: uiStore.ts に ToneCategory 型と activeToneFilter 状態を追加する**

`src/store/uiStore.ts` を読んで現在の状態を把握し、以下の変更を加える：

**ファイル先頭の型定義に追加（`export type ViewMode = ...` の隣に）:**
```ts
export type ToneCategory = 'vivid' | 'pastel' | 'dark' | 'light' | 'neutral'
```

**インターフェースの `sortBy` を更新する（`'tone'` を除去）:**
```ts
// 変更前
sortBy: 'order' | 'used_count' | 'hue' | 'tone'
setSortBy: (sort: 'order' | 'used_count' | 'hue' | 'tone') => void

// 変更後
sortBy: 'order' | 'used_count' | 'hue'
setSortBy: (sort: 'order' | 'used_count' | 'hue') => void
```

**インターフェースにトーンフィルター追加（`activeTraditionalFilter` のブロックの下）:**
```ts
// トーンフィルター
activeToneFilter: ToneCategory | null
setActiveToneFilter: (tone: ToneCategory | null) => void
```

**create() 内の初期状態に追加（`activeTraditionalFilter: false,` の下）:**
```ts
activeToneFilter: null,
setActiveToneFilter: (tone) => set({ activeToneFilter: tone }),
```

- [ ] **Step 2: AppLayout.tsx に getTone() を追加してフィルターパイプラインを更新する**

`src/components/layout/AppLayout.tsx` を読む。

**useUIStore のデストラクチャリングに追加:**
```ts
activeToneFilter,
// （既存の activeTraditionalFilter の隣に追加）
```

**フィルターパイプラインの Step 5 直後に Step 6 を追加する。`getToneOrder` 関数の直前か直後に `getTone` 関数を追加し、Step 6 ブロックを追加する:**

```ts
// AppLayout 内（getToneOrder の代わりに置く）
function getTone(hex: string): ToneCategory {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (s < 0.15) return 'neutral'                               // 無彩色
  if (l < 0.25) return 'dark'                                  // 暗い
  if (s >= 0.65 && l >= 0.35 && l <= 0.70) return 'vivid'     // 鮮やか
  if (l >= 0.70 && s < 0.55) return 'pastel'                   // 淡い
  if (l >= 0.55) return 'light'                                 // 明るい
  return 'neutral'
}
```

**Step 5 の後に Step 6 を追加:**
```ts
// 6. トーンフィルター
const step6 = activeToneFilter
  ? step5.filter((c) => getTone(c.hex) === activeToneFilter)
  : step5
```

**displayColors のソートロジックを更新（`getToneOrder` のブランチを除去、`step5` を `step6` に差し替え）:**
```ts
const dir = sortDirection === 'asc' ? 1 : -1
const displayColors = (() => {
  if (sortBy === 'used_count') {
    return [...step6].sort((a, b) => dir * ((a.used_count ?? 0) - (b.used_count ?? 0)))
  }
  if (sortBy === 'hue') {
    return [...step6].sort((a, b) => dir * (getHue(a.hex) - getHue(b.hex)))
  }
  // 追加順
  if (sortDirection === 'desc') {
    return [...step6].reverse()
  }
  return step6
})()
```

`getToneOrder` 関数（行 219-235 付近）は不要になるので削除する。

- [ ] **Step 3: FilterBar.tsx を更新する**

`src/components/views/FilterBar.tsx` を読む。

**`SORT_OPTIONS` から `'tone'` を除去する:**
```ts
const SORT_OPTIONS = [
  { value: 'order', label: '追加順' },
  { value: 'hue', label: '色相順' },
  { value: 'used_count', label: 'よく使う順' },
] as const
```

**ファイル先頭に `TONE_FILTERS` 定数を追加する:**
```ts
const TONE_FILTERS: { value: ToneCategory; label: string }[] = [
  { value: 'vivid',   label: 'ビビッド' },
  { value: 'pastel',  label: 'パステル' },
  { value: 'dark',    label: 'ダーク' },
  { value: 'light',   label: 'ライト' },
  { value: 'neutral', label: 'ニュートラル' },
]
```

**`ToneCategory` を uiStore からインポートする:**
```ts
import { useUIStore, type ToneCategory } from '@/store/uiStore'
```

**useUIStore のデストラクチャリングに追加:**
```ts
activeToneFilter,
setActiveToneFilter,
```

**HUE_FILTERS の後、伝統色ボタンの前にセパレーターとトーンフィルターを追加する:**
```tsx
{/* セパレーター */}
<div className="w-px h-4 bg-border flex-shrink-0" />

{/* トーンフィルター */}
{TONE_FILTERS.map((tone) => {
  const isActive = activeToneFilter === tone.value
  return (
    <button
      key={tone.value}
      type="button"
      onClick={() => setActiveToneFilter(activeToneFilter === tone.value ? null : tone.value)}
      className={[
        'px-2 py-1 rounded-full text-xs transition-colors flex-shrink-0',
        isActive
          ? 'bg-accent/10 text-accent-soft border border-accent glow-accent-sm font-medium'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay border border-transparent',
      ].join(' ')}
    >
      {tone.label}
    </button>
  )
})}
```

- [ ] **Step 4: type-check を実行する**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npm run type-check
```

エラーがあれば修正する。主に `setSortBy('tone')` を呼んでいる箇所が残っていないか確認する（FilterBar の `SORT_OPTIONS` から既に除去されているので通常は発生しない）。

- [ ] **Step 5: コミット**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker
git add src/store/uiStore.ts src/components/layout/AppLayout.tsx src/components/views/FilterBar.tsx
git commit -m "feat: promote tone from sort option to filter with 5-category buttons"
```

---

## 完了後の確認コマンド

```bash
# TypeScript エラーなし
npm run type-check

# ビルドが通る
npm run build:vite
```

---

## 注意事項

- **Task 2 の ListView フラット化:** 既存コードの `sortBy !== 'order'` ブロック内に `sortBy === 'used_count'` / `sortBy === 'tone'` のフラット表示実装がある。その実装を参考に `sortBy === 'hue'` 分岐を統合して一本化する。
- **Task 3 で `getToneOrder` を削除する:** AppLayout の `sortBy === 'tone'` ブランチも同時に削除すること（`displayColors` の新しい実装では参照しない）。
- **`ToneCategory` の import:** FilterBar が `ToneCategory` 型を使うため `uiStore` からの named import が必要。
