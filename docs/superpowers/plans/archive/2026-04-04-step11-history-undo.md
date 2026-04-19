> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

# Step 11: 履歴（IndexedDB）・Undo/Redo

## 目標

ピッカーで取得した色を IndexedDB にローカル保存（最新50件 FIFO）し、サイドバーの「最近使った色」セクションに表示する。colorStore に Undo/Redo スタックを追加し、⌘+Z / ⌘+Shift+Z で操作を巻き戻せるようにする。

---

## 新規パッケージ

```
npm install idb
```

`idb` は IndexedDB の Promise ラッパー。ネイティブ IndexedDB より簡潔に扱える。

---

## アーキテクチャ

```
src/lib/
  historyDB.ts              — IndexedDB 操作（idb ライブラリ使用）

src/store/
  historyStore.ts           — IndexedDB 履歴の Zustand 管理
  colorStore.ts             — undoStack / redoStack 追加（既存ファイル変更）

src/hooks/
  useKeyboardShortcuts.ts   — ⌘+Z / ⌘+Shift+Z を Undo/Redo に接続（既存ファイル変更）
```

---

## タスク一覧

### Task 1: idb パッケージをインストールする

```bash
npm install idb
```

**確認:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 2: src/lib/historyDB.ts を作成する

**作成ファイル:** `src/lib/historyDB.ts`

```typescript
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'colorpicker-history'
const STORE_NAME = 'color_history'
const MAX_ITEMS = 50

export interface HistoryColor {
  id: string
  hex: string
  alpha: number
  created_at: string
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

/**
 * 履歴に色を追加する。
 * - 同一 HEX は上書き（重複作成しない）
 * - MAX_ITEMS を超えた場合は古いものを削除（FIFO）
 */
export async function addToHistory(hex: string, alpha = 1.0): Promise<void> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME) as HistoryColor[]

  // 同一 HEX を除外
  const filtered = all.filter((c) => c.hex.toUpperCase() !== hex.toUpperCase())

  const newItem: HistoryColor = {
    id: crypto.randomUUID(),
    hex: hex.toUpperCase(),
    alpha,
    created_at: new Date().toISOString(),
  }

  // 新しいものを先頭に、MAX_ITEMS 件に絞る
  const updated = [newItem, ...filtered].slice(0, MAX_ITEMS)

  const tx = db.transaction(STORE_NAME, 'readwrite')
  await tx.store.clear()
  for (const item of updated) {
    await tx.store.add(item)
  }
  await tx.done
}

/**
 * 履歴を取得する（新しい順）
 */
export async function getHistory(): Promise<HistoryColor[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME) as HistoryColor[]
  return all.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

/**
 * 履歴を全件削除する
 */
export async function clearHistory(): Promise<void> {
  const db = await getDB()
  await db.clear(STORE_NAME)
}
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 3: src/store/historyStore.ts を作成する

**作成ファイル:** `src/store/historyStore.ts`

```typescript
import { create } from 'zustand'
import {
  addToHistory as dbAddToHistory,
  getHistory,
  clearHistory as dbClearHistory,
  type HistoryColor,
} from '@/lib/historyDB'

interface HistoryStore {
  historyColors: HistoryColor[]
  loading: boolean

  /** IndexedDB から履歴を読み込む */
  loadHistory: () => Promise<void>

  /** 色を履歴に追加し、ストアを更新する */
  addToHistory: (hex: string, alpha?: number) => Promise<void>

  /** 履歴を全件削除する */
  clearHistory: () => Promise<void>
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  historyColors: [],
  loading: false,

  loadHistory: async () => {
    set({ loading: true })
    const colors = await getHistory()
    set({ historyColors: colors, loading: false })
  },

  addToHistory: async (hex, alpha = 1.0) => {
    await dbAddToHistory(hex, alpha)
    const colors = await getHistory()
    set({ historyColors: colors })
  },

  clearHistory: async () => {
    await dbClearHistory()
    set({ historyColors: [] })
  },
}))
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 4: AddColorModal / PickerModal で addToHistory を呼び出す

**変更対象ファイル:** 色を追加するモーダルコンポーネント（`AddColorModal.tsx` または `PickerModal.tsx`）

方針：
- 色が確定したタイミング（ユーザーが色をピックまたは入力した直後）で `useHistoryStore().addToHistory` を呼び出す
- Supabase への保存（`colorStore.addColor`）とは分離して呼び出す

```typescript
import { useHistoryStore } from '@/store/historyStore'

// コンポーネント内
const { addToHistory } = useHistoryStore()

// 色が確定したとき（例：ピッカーで色を選んだとき）
async function handleColorPicked(hex: string, alpha: number) {
  // IndexedDB 履歴に追加（ローカルのみ・常に実行）
  await addToHistory(hex, alpha)
  // Supabase への保存はユーザーが「保存」ボタンを押したときのみ
}
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 5: Sidebar の「最近使った色」セクションを historyStore に接続する

**変更対象ファイル:** `src/components/layout/Sidebar.tsx`（または相当するコンポーネント）

方針：
- アプリ起動時に `loadHistory()` を呼び出す（`useEffect`）
- `historyColors` を `ColorSwatch` などで一覧表示する
- 各色をクリックしたとき、選択状態にする（または AddColorModal を開いて HEX をプリセット）

```typescript
import { useEffect } from 'react'
import { useHistoryStore } from '@/store/historyStore'
import { ColorSwatch } from '@/components/color/ColorSwatch'

// コンポーネント内
const { historyColors, loadHistory, clearHistory } = useHistoryStore()

useEffect(() => {
  loadHistory()
}, [loadHistory])

// JSX — 「最近使った色」セクション
<section>
  <div className="flex items-center justify-between px-4 py-2">
    <span className="text-xs text-text-muted font-medium">最近使った色</span>
    {historyColors.length > 0 && (
      <button
        type="button"
        onClick={clearHistory}
        className="text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        クリア
      </button>
    )}
  </div>
  {historyColors.length === 0 ? (
    <p className="px-4 text-xs text-text-muted">履歴はありません</p>
  ) : (
    <div className="flex flex-wrap gap-1.5 px-4 pb-2">
      {historyColors.map((c) => (
        <button
          key={c.id}
          type="button"
          title={c.hex}
          onClick={() => {
            // TODO: AddColorModal を c.hex でプリセットして開く
          }}
        >
          <ColorSwatch hex={c.hex} alpha={c.alpha} size="sm" />
        </button>
      ))}
    </div>
  )}
</section>
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 6: colorStore に undoStack / redoStack と undo / redo メソッドを追加する

**変更ファイル:** `src/store/colorStore.ts`

追加するインターフェースフィールド：

```typescript
// colorStore に追加するフィールド
undoStack: Color[][]
redoStack: Color[][]

// undo/redo メソッド
undo: () => void
redo: () => void

// 変更前にスナップショットを保存するプライベートヘルパー
_snapshot: () => void
```

完全な変更版（既存の colorStore.ts に追記する形）：

```typescript
// インターフェースに追加
undoStack: Color[][]
redoStack: Color[][]
undo: () => void
redo: () => void
_snapshot: () => void

// create 内の初期値に追加
undoStack: [],
redoStack: [],

// _snapshot 実装
_snapshot: () => {
  set((state) => ({
    undoStack: [...state.undoStack.slice(-19), [...state.colors]], // 最大20スナップショット
    redoStack: [], // 新しい変更でやり直しスタックをクリア
  }))
},

// undo 実装
undo: () => {
  set((state) => {
    if (state.undoStack.length === 0) return state
    const prev = state.undoStack[state.undoStack.length - 1]
    return {
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, [...state.colors]],
      colors: prev,
    }
  })
},

// redo 実装
redo: () => {
  set((state) => {
    if (state.redoStack.length === 0) return state
    const next = state.redoStack[state.redoStack.length - 1]
    return {
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, [...state.colors]],
      colors: next,
    }
  })
},
```

各変更メソッド（`addColor`, `updateColor`, `deleteColor`, `reorderColors`）の先頭に `get()._snapshot()` を呼び出す。

例（addColor）：
```typescript
addColor: async (hex, alpha = 1.0, folderId = null) => {
  get()._snapshot() // 変更前にスナップショット保存
  // ... 既存の実装
},
```

**注意：** `_snapshot` は外部から直接使用しない内部ヘルパー。TypeScript の命名規約上 `_` プレフィックスで区別する。

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 7: useKeyboardShortcuts の ⌘+Z / ⌘+Shift+Z を Undo/Redo に接続する

**変更対象ファイル:** `src/hooks/useKeyboardShortcuts.ts`（または相当するファイル）

```typescript
import { useColorStore } from '@/store/colorStore'

// フック内
const { undo, redo } = useColorStore()

// キーハンドラー内に追加
case 'z':
  if (e.metaKey && e.shiftKey) {
    e.preventDefault()
    redo()
  } else if (e.metaKey) {
    e.preventDefault()
    undo()
  }
  break
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

**コミット:**
```bash
git add src/lib/historyDB.ts src/store/historyStore.ts src/store/colorStore.ts
git commit -m "$(cat <<'EOF'
feat: add IndexedDB color history and Undo/Redo to colorStore

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
