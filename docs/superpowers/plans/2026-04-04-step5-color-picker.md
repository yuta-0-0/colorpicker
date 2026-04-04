# Step 5 — カラー取得（画像スポイト・画像パレット一括抽出・スクリーンピッカー）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「＋ 追加」ボタンを3択メニューに拡張し、テキスト入力・画像スポイト/パレット抽出・スクリーンピッカーの3つのカラー取得フローを提供する。

**Architecture:** 「＋ 追加」クリック時に AddMenuPopover（3択ポップオーバー）を表示。テキスト入力は既存の AddColorModal へ、画像取得は新規 ImagePickerModal（スポイト + パレット抽出を1モーダルに統合）へ誘導。スクリーンピッカーはモーダルなしに EyeDropper Web API を直接呼び出す。

**Tech Stack:** React, TypeScript, Tailwind CSS, colorthief（npm追加）, EyeDropper Web API（Electron/Chrome 内蔵）

---

## ファイルマップ

| ファイル | 変更種別 | 責務 |
|---------|---------|------|
| `src/components/color/AddMenuPopover.tsx` | 新規作成 | 3択ミニポップオーバー |
| `src/components/color/ImagePickerModal.tsx` | 新規作成 | 画像アップロード・スポイト・パレット抽出 |
| `src/components/layout/AppLayout.tsx` | 変更 | メニュー表示・スクリーンピッカー処理 |
| `src/types/colorthief.d.ts` | 新規作成 | colorthief 型定義 |
| `package.json` / `package-lock.json` | 変更（npm install） | colorthief 追加 |

`AddColorModal.tsx` は変更なし。

---

## Task 1: colorthief インストールと型定義

**Files:**
- Create: `src/types/colorthief.d.ts`
- Modify: `package.json`（npm install で自動更新）

- [ ] **Step 1: colorthief をインストール**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker
npm install colorthief
```

期待される出力: `added 1 package` のような npm インストール完了メッセージ

- [ ] **Step 2: colorthief の型定義ファイルを作成**

`@types/colorthief` は npm に存在しないため手動作成する。

`src/types/colorthief.d.ts` を新規作成：

```typescript
declare module 'colorthief' {
  export default class ColorThief {
    getColor(img: HTMLImageElement, quality?: number): [number, number, number]
    getPalette(img: HTMLImageElement, colorCount?: number, quality?: number): [number, number, number][]
  }
}
```

- [ ] **Step 3: 型チェックを実行して確認**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

期待される出力: エラーなし（Found 0 errors）

- [ ] **Step 4: コミット**

```bash
git add src/types/colorthief.d.ts package.json package-lock.json
git commit -m "feat: install colorthief and add type declaration"
```

---

## Task 2: AddMenuPopover コンポーネントを作成

**Files:**
- Create: `src/components/color/AddMenuPopover.tsx`

- [ ] **Step 1: `src/components/color/AddMenuPopover.tsx` を新規作成**

```typescript
import { useEffect, useRef } from 'react'

interface AddMenuPopoverProps {
  onSelectText: () => void
  onSelectImage: () => void
  onSelectScreen: () => void
  onClose: () => void
}

export function AddMenuPopover({
  onSelectText,
  onSelectImage,
  onSelectScreen,
  onClose,
}: AddMenuPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

  // 外部クリックで閉じる
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  const items = [
    {
      label: 'テキストで入力',
      description: 'HEX / RGB / HSL',
      onClick: onSelectText,
      show: true,
    },
    {
      label: '画像から取得',
      description: 'スポイト / パレット抽出',
      onClick: onSelectImage,
      show: true,
    },
    {
      label: 'スクリーンから取得',
      description: '画面上の色をクリックで取得',
      onClick: onSelectScreen,
      show: supportsEyeDropper,
    },
  ]

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-52 bg-surface-raised border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      {items
        .filter((item) => item.show)
        .map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              onClose()
              item.onClick()
            }}
            className="w-full text-left px-4 py-3 hover:bg-surface-overlay transition-colors"
          >
            <p className="text-sm text-text-primary leading-tight">{item.label}</p>
            <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
          </button>
        ))}
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/color/AddMenuPopover.tsx
git commit -m "feat: add AddMenuPopover with 3-option menu"
```

---

## Task 3: AppLayout に AddMenuPopover を組み込む

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: AppLayout.tsx の import と state を更新**

`AppLayout.tsx` の先頭 import に追加：

```typescript
import { AddMenuPopover } from '@/components/color/AddMenuPopover'
import { ImagePickerModal } from '@/components/color/ImagePickerModal'
```

`useState` の宣言を変更（既存の `showAddModal` はそのまま残し、以下を追加）：

```typescript
const [showMenu, setShowMenu] = useState(false)
const [showAddModal, setShowAddModal] = useState(false)      // 既存・変更なし
const [showImageModal, setShowImageModal] = useState(false)  // 追加
```

- [ ] **Step 2: ヘッダーの「＋ 追加」ボタン部分を変更**

変更前:
```tsx
<button
  onClick={() => setShowAddModal(true)}
  type="button"
  className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
>
  ＋ 追加
</button>
```

変更後:
```tsx
<div className="relative">
  <button
    onClick={() => setShowMenu((v) => !v)}
    type="button"
    className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
  >
    ＋ 追加
  </button>
  {showMenu && (
    <AddMenuPopover
      onSelectText={() => setShowAddModal(true)}
      onSelectImage={() => setShowImageModal(true)}
      onSelectScreen={handleScreenPick}
      onClose={() => setShowMenu(false)}
    />
  )}
</div>
```

- [ ] **Step 3: handleScreenPick 関数を追加**

`showAddModal` の useState 宣言の直後に追加：

```typescript
const { addColor } = useColorStore()

const handleScreenPick = async () => {
  setShowMenu(false)
  try {
    const eyeDropper = new (window as Window & { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper()
    const { sRGBHex } = await eyeDropper.open()
    await addColor(sRGBHex, 1.0, activeFolderId)
  } catch {
    // ユーザーキャンセルは無視
  }
}
```

注: `useColorStore` は既に `AppLayout.tsx` でインポート済みのため import 追加は不要。`addColor` を destructure に追加するだけでよい。

既存の destructure：
```typescript
const { colors, loading: colorsLoading, fetchColors } = useColorStore()
```

変更後：
```typescript
const { colors, loading: colorsLoading, fetchColors, addColor } = useColorStore()
```

- [ ] **Step 4: モーダルレンダリングを追加**

ファイル末尾の `{showAddModal && <AddColorModal ... />}` の直後に追加：

```tsx
{showImageModal && <ImagePickerModal onClose={() => setShowImageModal(false)} />}
```

- [ ] **Step 5: 型チェックを実行**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

期待される出力: エラーなし（ImagePickerModal が未作成なのでエラーが出る場合は Task 4 完了後に再実行）

- [ ] **Step 6: コミット**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: wire AddMenuPopover and screen picker into AppLayout"
```

---

## Task 4: ImagePickerModal — 画像アップロード + スポイト機能

**Files:**
- Create: `src/components/color/ImagePickerModal.tsx`

- [ ] **Step 1: `src/components/color/ImagePickerModal.tsx` を新規作成**

```typescript
import { useState, useRef } from 'react'
import { ColorSwatch } from './ColorSwatch'
import { useColorStore } from '@/store/colorStore'
import { useUIStore } from '@/store/uiStore'

interface ImagePickerModalProps {
  onClose: () => void
}

export function ImagePickerModal({ onClose }: ImagePickerModalProps) {
  const { addColor } = useColorStore()
  const { activeFolderId } = useUIStore()

  // 共有: アップロード済み画像
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)

  // スポイト
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [eyedropperHex, setEyedropperHex] = useState<string | null>(null)
  const [savingEyedropper, setSavingEyedropper] = useState(false)

  // パレット
  const imgElementRef = useRef<HTMLImageElement | null>(null)
  const [palette, setPalette] = useState<string[]>([])
  const [selectedHexes, setSelectedHexes] = useState<Set<string>>(new Set())
  const [extracting, setExtracting] = useState(false)
  const [savingPalette, setSavingPalette] = useState(false)

  // RGB配列 → HEX文字列（#RRGGBB 大文字）
  const rgbToHex = (r: number, g: number, b: number): string =>
    ('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')).toUpperCase()

  // 画像ファイルを読み込んでcanvasに描画 + colorthiefでパレット抽出
  const loadImageFile = async (file: File) => {
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
    const url = URL.createObjectURL(file)
    setImageObjectUrl(url)
    setEyedropperHex(null)
    setPalette([])
    setSelectedHexes(new Set())

    const img = new Image()
    img.onload = async () => {
      // canvas に描画（スポイト用）
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.drawImage(img, 0, 0)
      }
      imgElementRef.current = img
      setImageLoaded(true)

      // colorthief でパレット抽出
      setExtracting(true)
      try {
        const ColorThief = (await import('colorthief')).default
        const thief = new ColorThief()
        const raw = thief.getPalette(img, 5)
        const hexes = raw.map(([r, g, b]) => rgbToHex(r, g, b))
        setPalette(hexes)
        setSelectedHexes(new Set(hexes))
      } catch {
        // 抽出失敗時はパレットを表示しない
      } finally {
        setExtracting(false)
      }
    }
    img.src = url
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadImageFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) loadImageFile(file)
  }

  // canvas クリック → スポイト
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width))
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
    setEyedropperHex(rgbToHex(r, g, b))
  }

  // スポイト色を保存して閉じる
  const handleSaveEyedropper = async () => {
    if (!eyedropperHex) return
    setSavingEyedropper(true)
    await addColor(eyedropperHex, 1.0, activeFolderId)
    setSavingEyedropper(false)
    onClose()
  }

  // パレットのチェックボックストグル
  const toggleHex = (hex: string) => {
    setSelectedHexes((prev) => {
      const next = new Set(prev)
      if (next.has(hex)) next.delete(hex)
      else next.add(hex)
      return next
    })
  }

  // 選択したパレット色を一括保存して閉じる
  const handleSavePalette = async () => {
    if (selectedHexes.size === 0) return
    setSavingPalette(true)
    for (const hex of selectedHexes) {
      await addColor(hex, 1.0, activeFolderId)
    }
    setSavingPalette(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface-raised border border-border rounded-2xl p-6 w-[420px] max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-medium text-text-primary mb-4">画像から色を取得</h2>

        {!imageLoaded ? (
          /* --- アップロードゾーン --- */
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-accent transition-colors"
            onClick={() => document.getElementById('image-picker-input')?.click()}
          >
            <p className="text-text-secondary text-sm mb-1">
              画像をドロップ、またはクリックして選択
            </p>
            <p className="text-text-muted text-xs">PNG / JPG / WebP 対応</p>
            <input
              id="image-picker-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <>
            {/* --- キャンバス（スポイト用） --- */}
            <p className="text-xs text-text-secondary mb-2">
              画像をクリックして1色取得
            </p>
            <div
              className="rounded-xl overflow-hidden border border-border mb-3"
              style={{ maxHeight: '220px' }}
            >
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full object-contain cursor-crosshair"
                style={{ maxHeight: '220px', display: 'block' }}
              />
            </div>

            {/* スポイト結果 */}
            {eyedropperHex && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-surface-overlay rounded-xl">
                <ColorSwatch hex={eyedropperHex} size="sm" />
                <span className="text-sm font-mono text-text-primary flex-1">
                  {eyedropperHex}
                </span>
                <button
                  type="button"
                  onClick={handleSaveEyedropper}
                  disabled={savingEyedropper}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
                >
                  {savingEyedropper ? '追加中...' : 'この色を追加'}
                </button>
              </div>
            )}

            {/* --- パレット抽出結果 --- */}
            {extracting ? (
              <p className="text-text-muted text-xs text-center py-3">パレットを抽出中...</p>
            ) : palette.length > 0 ? (
              <>
                <p className="text-xs text-text-secondary mb-2">
                  抽出パレット（{selectedHexes.size}/{palette.length} 色を選択中）
                </p>
                <div className="space-y-1 mb-4">
                  {palette.map((hex) => (
                    <label
                      key={hex}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-overlay cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedHexes.has(hex)}
                        onChange={() => toggleHex(hex)}
                        className="sr-only"
                      />
                      <div
                        className={[
                          'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          selectedHexes.has(hex)
                            ? 'border-accent bg-accent'
                            : 'border-border',
                        ].join(' ')}
                      >
                        {selectedHexes.has(hex) && (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path
                              d="M1 3L3 5L7 1"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <ColorSwatch hex={hex} size="sm" />
                      <span className="text-xs font-mono text-text-primary">{hex}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleSavePalette}
                  disabled={selectedHexes.size === 0 || savingPalette}
                  className="w-full py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-2"
                >
                  {savingPalette
                    ? '追加中...'
                    : `選択した ${selectedHexes.size} 色を追加`}
                </button>
              </>
            ) : null}

            {/* 画像変更 / キャンセル */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setImageLoaded(false)
                  setEyedropperHex(null)
                  setPalette([])
                  setSelectedHexes(new Set())
                }}
                className="flex-1 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary border border-border hover:bg-surface-overlay transition-colors"
              >
                画像を変更
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary border border-border hover:bg-surface-overlay transition-colors"
              >
                キャンセル
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/color/ImagePickerModal.tsx
git commit -m "feat: add ImagePickerModal with eyedropper and palette extraction"
```

---

## Task 5: AppLayout の型チェック通しと動作確認

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`（Task 3 の続き）

- [ ] **Step 1: AppLayout.tsx の最終型チェック**

Task 3 と Task 4 が完了しているため、ImagePickerModal の import エラーが解消されている。

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 2: 動作確認（手動テスト）**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run dev:vite
```

ブラウザ（または Electron）で以下を確認：

1. 「＋ 追加」をクリック → 3択ポップオーバーが表示される
2. ポップオーバー外をクリック → ポップオーバーが閉じる
3. 「テキストで入力」→ 既存の AddColorModal が開く
4. 「画像から取得」→ ImagePickerModal が開く
5. ImagePickerModal に画像をドロップ → キャンバスに描画される
6. キャンバスをクリック → スポイト結果が表示される
7. 「この色を追加」→ モーダルが閉じ、色がリストに追加される
8. 「画像から取得」で再度画像を開く → パレット5色が表示される
9. 任意のチェックを外して「選択したN色を追加」→ モーダルが閉じ、複数色が追加される
10. EyeDropper 対応環境（Electron / Chrome）では「スクリーンから取得」が表示される
11. 「スクリーンから取得」→ OS ネイティブのカラーピッカーが起動する

- [ ] **Step 3: 最終コミット**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: step5 complete - color picker with menu, image eyedropper, palette, screen"
```

---

## 完了基準

- [ ] 「＋ 追加」クリックで3択ポップオーバーが表示される
- [ ] 「テキストで入力」→ 既存の AddColorModal が開く（動作変更なし）
- [ ] 「画像から取得」→ ImagePickerModal が開く
  - [ ] 画像ドロップ / クリックアップロードで画像が表示される
  - [ ] キャンバスをクリックして1色スポイトできる
  - [ ] 「この色を追加」でモーダルが閉じ色が保存される
  - [ ] 画像アップロード時にパレット5色が自動抽出される
  - [ ] チェックボックスで選択した色だけ一括追加できる
- [ ] EyeDropper 対応環境では「スクリーンから取得」が表示される
  - [ ] OS ネイティブのカラーピッカーが起動して色を取得できる
  - [ ] キャンセル時は何も起こらない
- [ ] EyeDropper 非対応環境では「スクリーンから取得」が表示されない
- [ ] `npm run type-check` がエラーなしで通る

---

## 注意事項

- `colorthief.getPalette()` は `img.onload` 完了後に呼ぶこと（本計画の実装通り）
- canvas の `getImageData()` は同一オリジン制限があるが、`URL.createObjectURL()` 経由のローカルファイルは制限を受けない
- `EyeDropper` は TypeScript の標準型定義に含まれないため、`window as Window & { EyeDropper: ... }` でキャストする
- colorthief は dynamic import（`import('colorthief')`）で遅延ロードし、初回使用時にのみ読み込む
