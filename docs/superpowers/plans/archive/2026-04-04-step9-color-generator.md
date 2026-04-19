# Step 9: カラージェネレーター Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 配色パターン提案機能（補色・類似色・トライアド・テトラード・スプリット補色）を実装し、生成結果からワンクリックで保存できる。

**Current state:**
- `uiStore.ts` の `NavSection` 型にはすでに `'generator'` が含まれている（変更不要）
- `AppLayout.tsx` の `sectionTitle` には `'generator'` → `'カラージェネレーター'` が定義されているが、メインエリアは ListView/GalleryView しか表示しない
- `colorStore.addColor` は HEX + folderId を受け取って保存できる

**Architecture:**
- `src/lib/colorGenerator.ts` — 配色計算ロジック（HEX→HSL変換→配色計算→HEX変換）純粋関数のみ
- `src/components/generator/GeneratorView.tsx` — UI コンポーネント（ベース色入力 + パターン選択 + 生成結果 + 保存）
- `src/components/layout/AppLayout.tsx` — `activeSection === 'generator'` のとき GeneratorView を表示

---

## ファイル構成

```
src/
├── lib/
│   └── colorGenerator.ts              # 新規：配色計算ロジック
└── components/
    ├── generator/
    │   └── GeneratorView.tsx          # 新規：カラージェネレーター UI
    └── layout/
        └── AppLayout.tsx              # 修正：activeSection === 'generator' 分岐を追加
```

---

### Task 1: src/lib/colorGenerator.ts を作成する

**Files:**
- Create: `src/lib/colorGenerator.ts`

- [ ] **Step 1: colorGenerator.ts を作成する**

```typescript
// src/lib/colorGenerator.ts

/**
 * HEX 文字列を HSL のタプル [h, s, l] に変換する。
 * h: 0〜360, s: 0〜100, l: 0〜100
 */
function hexToHsl(hex: string): [number, number, number] {
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
function hslToHex(h: number, s: number, l: number): string {
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
```

- [ ] **Step 2: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && cd /Users/yutashimizu/Projects/apps/colorpicker && npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミットする**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && git add src/lib/colorGenerator.ts && git commit -m "feat: add colorGenerator with 5 color scheme patterns"
```

---

### Task 2: src/components/generator/GeneratorView.tsx を作成する

**Files:**
- Create: `src/components/generator/GeneratorView.tsx`

**前提知識:**
- `ColorSwatch` は `hex` と `alpha` と `size` props を受け取る（`src/components/color/ColorSwatch.tsx`）
- `colorStore.addColor(hex, alpha, folderId)` で色を保存できる
- `isValidHex` は `src/lib/colorUtils.ts` からインポートできる

- [ ] **Step 1: GeneratorView.tsx を作成する**

```typescript
// src/components/generator/GeneratorView.tsx
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
  const [baseHex, setBaseHex] = useState('#3A7BD5')
  const [inputValue, setInputValue] = useState('#3A7BD5')
  const [activeScheme, setActiveScheme] = useState<ColorScheme>('complementary')
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [savingAll, setSavingAll] = useState(false)

  const isValid = isValidHex(inputValue)
  const generatedColors = isValid ? generateScheme(inputValue, activeScheme) : []

  const handleInputChange = (value: string) => {
    setInputValue(value)
    if (isValidHex(value)) {
      setBaseHex(value)
    }
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
                  {index === 0 && (
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
```

- [ ] **Step 2: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && cd /Users/yutashimizu/Projects/apps/colorpicker && npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミットする**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && git add src/components/generator/GeneratorView.tsx && git commit -m "feat: add GeneratorView component with color scheme UI"
```

---

### Task 3: AppLayout に GeneratorView を組み込む

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

**Current state の確認:**
- `activeSection === 'generator'` のとき `sectionTitle` は `'カラージェネレーター'` になっている
- メインエリアの表示分岐は `colorsLoading ? ... : viewMode === 'list' ? <ListView> : <GalleryView>` のみ
- `uiStore.ts` の `NavSection` に `'generator'` はすでに含まれている（変更不要）

**変更方針:** `activeSection === 'generator'` のとき、ListView/GalleryView の代わりに `GeneratorView` を表示する。ヘッダーの `ViewToggle` と「＋ 追加」ボタンは generator 時は非表示にする。

- [ ] **Step 1: AppLayout.tsx を修正する**

```typescript
// src/components/layout/AppLayout.tsx
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ListView } from '@/components/views/ListView'
import { GalleryView } from '@/components/views/GalleryView'
import { GeneratorView } from '@/components/generator/GeneratorView'
import { ViewToggle } from '@/components/views/ViewToggle'
import { FilterBar } from '@/components/views/FilterBar'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { AddColorModal } from '@/components/color/AddColorModal'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useFolderStore } from '@/store/folderStore'

export function AppLayout() {
  const {
    viewMode,
    setViewMode,
    selectedColorId,
    isDetailPanelOpen,
    isSidebarOpen,
    setSidebarOpen,
    activeFolderId,
    activeSection,
  } = useUIStore()

  const { colors, loading: colorsLoading, fetchColors } = useColorStore()
  const { fetchFolders } = useFolderStore()
  const [showAddModal, setShowAddModal] = useState(false)

  // 初回データ取得
  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  // フォルダ・セクション変更時にデータ再取得
  // generator セクションではカラーリストの取得は不要
  useEffect(() => {
    if (activeSection === 'generator') return
    if (activeSection === 'favorites') {
      fetchColors()
    } else {
      fetchColors(activeFolderId)
    }
  }, [activeFolderId, activeSection, fetchColors])

  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? null

  // お気に入りフィルター
  const displayColors = activeSection === 'favorites'
    ? colors.filter((c) => c.is_favorite)
    : colors

  const sectionTitle =
    activeSection === 'favorites' ? 'お気に入り' :
    activeSection === 'history' ? '最近使った色' :
    activeSection === 'generator' ? 'カラージェネレーター' :
    'すべての色'

  const isGenerator = activeSection === 'generator'

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-text-primary">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={['fixed inset-y-0 left-0 z-30 transition-transform md:relative md:translate-x-0', isSidebarOpen ? 'translate-x-0' : '-translate-x-full'].join(' ')}>
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} type="button" className="md:hidden text-text-secondary hover:text-text-primary">☰</button>
          <h1 className="text-sm font-medium text-text-primary flex-1">{sectionTitle}</h1>
          {!isGenerator && (
            <>
              <ViewToggle mode={viewMode} onChange={setViewMode} />
              <button
                onClick={() => setShowAddModal(true)}
                type="button"
                className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
              >
                ＋ 追加
              </button>
            </>
          )}
        </header>

        {!isGenerator && <FilterBar />}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {isGenerator ? (
              <GeneratorView />
            ) : colorsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-text-muted text-sm">読み込み中...</p>
              </div>
            ) : viewMode === 'list' ? (
              <ListView colors={displayColors} />
            ) : (
              <GalleryView colors={displayColors} />
            )}
          </div>
          {isDetailPanelOpen && selectedColor && (
            <DetailPanel color={selectedColor} />
          )}
        </div>
      </div>

      {showAddModal && <AddColorModal onClose={() => setShowAddModal(false)} />}
    </div>
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
cd /Users/yutashimizu/Projects/apps/colorpicker && git add src/components/layout/AppLayout.tsx && git commit -m "feat: integrate GeneratorView into AppLayout for generator section"
```

---

## 動作確認チェックリスト

- [ ] サイドバーの「カラージェネレーター」をクリックすると GeneratorView が表示される
- [ ] generator セクションでは ViewToggle と「＋ 追加」ボタンが非表示になる
- [ ] generator セクションでは FilterBar が非表示になる
- [ ] HEX 入力欄に有効な値（例: #3A7BD5）を入力すると生成結果が表示される
- [ ] 無効な HEX を入力すると赤枠と「無効な値」テキストが表示される
- [ ] ネイティブカラーピッカーで色を選ぶと HEX 入力欄と生成結果が更新される
- [ ] 5 つの配色パターンボタンがすべて動作する
- [ ] 生成結果の各色に「保存」ボタンがあり、クリックすると colorStore に追加される
- [ ] 「すべて保存」ボタンで全色がまとめて保存される
- [ ] カラーバーで生成した配色が視覚的に確認できる
- [ ] 「すべての色」セクションに戻ると保存した色が一覧に表示されている

---

## 設計メモ

**ベース色はなぜ配列の先頭に固定するか:** ユーザーが入力したベース色は配色の基準点であり、生成された他の色との対比を見やすくするため。`analogous`（類似色）のみベース色が配列の中央（インデックス 1）になるが、UI 上ではすべて同等に並べて表示する。

**ネイティブカラーピッカーについて:** `<input type="color">` は `opacity-0` で不可視にし、上に `div` でカラースウォッチを重ねる。クリックすると OS ネイティブのカラーピッカーが開く。HEX テキスト入力とリアルタイム同期する。

**addColor の重複処理:** `colorStore.addColor` は同一 HEX が既存の場合 `updated_at` を更新してリスト最上部に移動するだけで重複を作らない。「すべて保存」で複数色を連続保存しても安全。

**フォルダ未指定での保存:** `addColor(hex)` は `folderId` 省略時に `null`（フォルダなし）で保存される。将来的に「保存先フォルダを選ぶ」UI を追加する場合は、GeneratorView にフォルダセレクターを追加して `addColor(hex, 1.0, selectedFolderId)` を呼ぶように拡張する。
