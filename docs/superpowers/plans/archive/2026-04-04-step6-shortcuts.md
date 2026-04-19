# Step 6: ショートカットキー 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `⌘+N` / `⌘+C` / `⌘+Delete` など 10 種のキーボードショートカットを実装する。

**Architecture:** `useKeyboardShortcuts` フックを新規作成し `AppLayout` で一元登録する。`uiStore` に `searchFocusTrigger`・`isAddingFolder` を追加して、SearchBar / FolderList がそれぞれ監視・対応する。入力中（input/textarea/contenteditable）はすべてのショートカットを無効化する。

**Tech Stack:** React 18, Zustand, TypeScript, Tailwind CSS

---

## ファイルマップ

| ファイル | 操作 | 内容 |
|---------|------|------|
| `src/hooks/useKeyboardShortcuts.ts` | 新規作成 | 全ショートカット登録フック |
| `src/store/uiStore.ts` | 修正 | `searchFocusTrigger`, `isAddingFolder` 追加 |
| `src/components/sidebar/SearchBar.tsx` | 修正 | `searchFocusTrigger` 監視 → `.focus()` |
| `src/components/sidebar/FolderList.tsx` | 修正 | `isAddingFolder` 監視 → インライン入力を開く |
| `src/components/layout/AppLayout.tsx` | 修正 | `useKeyboardShortcuts` 呼び出し |

---

## Task 1: uiStore に searchFocusTrigger と isAddingFolder を追加する

**Files:**
- Modify: `src/store/uiStore.ts`

- [ ] **Step 1: uiStore を開き、インターフェースと初期値に 2 フィールドを追加する**

`src/store/uiStore.ts` の `UIStore` インターフェースに以下を追加する:

```ts
// 検索フォーカス
searchFocusTrigger: number
triggerSearchFocus: () => void

// フォルダ追加
isAddingFolder: boolean
setIsAddingFolder: (v: boolean) => void
```

`create<UIStore>` の初期値に追加:

```ts
searchFocusTrigger: 0,
triggerSearchFocus: () => set((s) => ({ searchFocusTrigger: s.searchFocusTrigger + 1 })),

isAddingFolder: false,
setIsAddingFolder: (v) => set({ isAddingFolder: v }),
```

- [ ] **Step 2: ビルドエラーがないか確認する**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit 2>&1 | head -20
```

期待: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/store/uiStore.ts
git commit -m "feat: add searchFocusTrigger and isAddingFolder to uiStore"
```

---

## Task 2: SearchBar を searchFocusTrigger に対応させる

**Files:**
- Modify: `src/components/sidebar/SearchBar.tsx`

- [ ] **Step 1: SearchBar に useRef と useEffect を追加する**

`src/components/sidebar/SearchBar.tsx` を以下に置き換える:

```tsx
import { useEffect, useRef } from 'react'
import { useUIStore } from '@/store/uiStore'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const searchFocusTrigger = useUIStore((s) => s.searchFocusTrigger)

  useEffect(() => {
    if (searchFocusTrigger > 0) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [searchFocusTrigger])

  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs">
        ⌘F
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="検索"
        className="w-full pl-9 pr-3 py-1.5 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:outline-dashed focus:outline-2 focus:outline-offset-1 focus:outline-accent/50 transition-colors"
      />
    </div>
  )
}
```

> **デザイン注記（Figma 参照）:** `focus:outline-dashed` でフォーカスリングをダッシュ線にする。Figma の選択ハンドルを模した署名スタイル。

- [ ] **Step 2: 型チェック**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: コミット**

```bash
git add src/components/sidebar/SearchBar.tsx
git commit -m "feat: focus SearchBar on searchFocusTrigger"
```

---

## Task 3: FolderList を isAddingFolder に対応させる

**Files:**
- Modify: `src/components/sidebar/FolderList.tsx`

- [ ] **Step 1: FolderList に isAddingFolder の監視を追加する**

`FolderList` コンポーネント内の `useState` 初期化 (`isCreating`) の直後に以下を追加:

```ts
const { isAddingFolder, setIsAddingFolder } = useUIStore()

// ショートカット ⌘+Shift+N からの外部トリガーを監視
useEffect(() => {
  if (isAddingFolder) {
    setIsCreating(true)
    setIsAddingFolder(false)
  }
}, [isAddingFolder, setIsAddingFolder])
```

ファイル先頭の import に追加:

```ts
import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
```

- [ ] **Step 2: 型チェック**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: コミット**

```bash
git add src/components/sidebar/FolderList.tsx
git commit -m "feat: open folder create input on isAddingFolder trigger"
```

---

## Task 4: useKeyboardShortcuts フックを作成する

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 1: `src/hooks/` ディレクトリを作成し、フックファイルを作成する**

`src/hooks/useKeyboardShortcuts.ts` を以下の内容で作成:

```ts
import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'

interface ShortcutHandlers {
  openAddModal: () => void
  openScreenPicker: () => void
}

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

export function useKeyboardShortcuts({ openAddModal, openScreenPicker }: ShortcutHandlers) {
  const {
    selectedColorId,
    setViewMode,
    setActiveSection,
    triggerSearchFocus,
    setIsAddingFolder,
  } = useUIStore()

  const { colors, addColor, deleteColor } = useColorStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Mac: metaKey = ⌘
      if (!e.metaKey) return
      // 入力中は全スキップ
      if (isInputFocused()) return

      const key = e.key.toLowerCase()
      const shift = e.shiftKey

      // ⌘+N: 新規カラー追加モーダルを開く
      if (key === 'n' && !shift) {
        e.preventDefault()
        openAddModal()
        return
      }

      // ⌘+Shift+N: フォルダ追加
      if (key === 'n' && shift) {
        e.preventDefault()
        setIsAddingFolder(true)
        return
      }

      // ⌘+F: 検索フォーカス
      if (key === 'f' && !shift) {
        e.preventDefault()
        triggerSearchFocus()
        return
      }

      // ⌘+1: リストビュー
      if (key === '1') {
        e.preventDefault()
        setViewMode('list')
        return
      }

      // ⌘+2: ギャラリービュー
      if (key === '2') {
        e.preventDefault()
        setViewMode('gallery')
        return
      }

      // ⌘+G: カラージェネレーター
      if (key === 'g' && !shift) {
        e.preventDefault()
        setActiveSection('generator')
        return
      }

      // ⌘+Shift+C: スクリーンピッカー
      if (key === 'c' && shift) {
        e.preventDefault()
        openScreenPicker()
        return
      }

      // 以下は選択中の色が必要
      if (!selectedColorId) return
      const selected = colors.find((c) => c.id === selectedColorId)
      if (!selected) return

      // ⌘+C: 選択色をHEXコピー
      if (key === 'c' && !shift) {
        e.preventDefault()
        navigator.clipboard.writeText(selected.hex)
        return
      }

      // ⌘+D: 選択色を複製
      if (key === 'd' && !shift) {
        e.preventDefault()
        addColor(selected.hex, selected.alpha)
        return
      }

      // ⌘+Delete: 選択色を削除（ロック中は無効）
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selected.is_locked) return
        e.preventDefault()
        deleteColor(selected.id)
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedColorId,
    colors,
    setViewMode,
    setActiveSection,
    triggerSearchFocus,
    setIsAddingFolder,
    addColor,
    deleteColor,
    openAddModal,
    openScreenPicker,
  ])
}
```

- [ ] **Step 2: 型チェック**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: コミット**

```bash
git add src/hooks/useKeyboardShortcuts.ts
git commit -m "feat: add useKeyboardShortcuts hook"
```

---

## Task 5: AppLayout にフックを組み込む

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: AppLayout に useKeyboardShortcuts を追加する**

import 行に追加:

```ts
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
```

`AppLayout` 関数内の `handleScreenPick` の定義直後（`useEffect` の前）に追加:

```ts
useKeyboardShortcuts({
  openAddModal: () => setShowAddModal(true),
  openScreenPicker: handleScreenPick,
})
```

- [ ] **Step 2: 型チェック**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 動作確認**

開発サーバーを起動して以下を手動確認:

```bash
npm run dev
```

| ショートカット | 期待動作 |
|-------------|---------|
| `⌘+N` | 新規カラー追加モーダルが開く |
| `⌘+Shift+N` | サイドバーのフォルダ追加入力が開く |
| `⌘+F` | 検索バーにフォーカスが移る（ダッシュ枠線で強調） |
| `⌘+1` | リストビューに切り替わる |
| `⌘+2` | ギャラリービューに切り替わる |
| `⌘+G` | カラージェネレーターセクションに移動する |
| `⌘+Shift+C` | スクリーンピッカーが起動する |
| 色を選択 → `⌘+C` | HEXがクリップボードにコピーされる |
| 色を選択 → `⌘+D` | 色が複製される |
| 色を選択 → `⌘+Delete` | 色が削除される（ロック中は無効） |
| input にフォーカス中 → `⌘+N` | モーダルが開かない（入力中ガード確認） |

- [ ] **Step 4: コミット**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: wire useKeyboardShortcuts into AppLayout"
```

---

## 完了チェックリスト

- [ ] 全10ショートカットが動作する
- [ ] 入力中（input/textarea）にショートカットが誤発火しない
- [ ] ロック中の色に `⌘+Delete` が作用しない
- [ ] 色未選択時に `⌘+C` / `⌘+D` / `⌘+Delete` が無音で失敗する
- [ ] `⌘+F` でダッシュ線フォーカスリングが表示される
- [ ] 型エラーゼロ
