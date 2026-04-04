# Step 6 — ショートカットキー・ロック機能・お気に入り

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## 目的

アプリ内キーボードショートカットの全実装と、フォルダロック連動（ロック中フォルダ内の色も編集・削除不可）を実装する。

---

## 現状の把握

### 実装済み
- `electron/main.ts`: `⌘+Shift+P` グローバルショートカット（アプリフォーカス）
- `src/store/folderStore.ts`: `toggleFolderLock(id, isLocked)` 実装済み
- `src/store/colorStore.ts`: `updateColor`, `deleteColor`, `addColor` 実装済み
- `src/components/detail/DetailPanel.tsx`: `is_locked` / `is_favorite` のトグルUI実装済み
- `src/components/layout/AppLayout.tsx`: `activeFolderId`, `selectedColorId` をuiStoreから取得済み

### 未実装
- アプリ内キーボードショートカット（React useEffect）
- フォルダロック → ListView/GalleryView への prop 伝播
- `colorStore.addColor` でのフォルダロックチェック
- `electron/main.ts` への `⌘+Shift+C` 追加

---

## ファイル構成

```
src/
  hooks/
    useKeyboardShortcuts.ts    ← 新規作成
  store/
    uiStore.ts                 ← showAddModal を state に移動（AppLayoutからhookへ渡すため）
  components/
    layout/
      AppLayout.tsx            ← useKeyboardShortcuts をマウント、folderLocked prop を渡す
    views/
      ListView.tsx             ← folderLocked prop を受け取り、編集・削除を無効化
      GalleryView.tsx          ← folderLocked prop を受け取り、編集・削除を無効化
electron/
  main.ts                      ← ⌘+Shift+C 追加
```

---

## Task 1: `src/hooks/useKeyboardShortcuts.ts` 新規作成

**作成ファイル:** `src/hooks/useKeyboardShortcuts.ts`

```typescript
import { useEffect, useCallback, RefObject } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'

interface UseKeyboardShortcutsOptions {
  onShowAddModal: () => void
  onShowFolderCreate: () => void
  searchInputRef: RefObject<HTMLInputElement | null>
}

export function useKeyboardShortcuts({
  onShowAddModal,
  onShowFolderCreate,
  searchInputRef,
}: UseKeyboardShortcutsOptions) {
  const {
    selectedColorId,
    setViewMode,
    setActiveSection,
  } = useUIStore()

  const { colors, deleteColor, addColor, updateColor } = useColorStore()

  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? null

  const handleCopySelected = useCallback(() => {
    if (!selectedColor) return
    navigator.clipboard.writeText(selectedColor.hex)
  }, [selectedColor])

  const handleDuplicateSelected = useCallback(async () => {
    if (!selectedColor) return
    if (selectedColor.is_locked) return
    await addColor(selectedColor.hex, selectedColor.alpha, selectedColor.folder_id)
  }, [selectedColor, addColor])

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedColor) return
    if (selectedColor.is_locked) return
    await deleteColor(selectedColor.id)
  }, [selectedColor, deleteColor])

  const handleToggleFavorite = useCallback(async () => {
    if (!selectedColor) return
    await updateColor(selectedColor.id, { is_favorite: !selectedColor.is_favorite })
  }, [selectedColor, updateColor])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea'

      // ⌘+F: 検索フォーカス（input中でも動作させる）
      if (isMeta && e.key === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      // 入力中はその他のショートカットをスキップ
      if (isInput) return

      if (isMeta && e.key === 'n' && !e.shiftKey) {
        e.preventDefault()
        onShowAddModal()
      }

      if (isMeta && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        onShowFolderCreate()
      }

      if (isMeta && e.key === '1') {
        e.preventDefault()
        setViewMode('list')
      }

      if (isMeta && e.key === '2') {
        e.preventDefault()
        setViewMode('gallery')
      }

      if (isMeta && e.key === 'g' && !e.shiftKey) {
        e.preventDefault()
        setActiveSection('generator')
      }

      if (isMeta && e.key === 'c' && !e.shiftKey && selectedColorId) {
        e.preventDefault()
        handleCopySelected()
      }

      if (isMeta && e.key === 'd' && !e.shiftKey && selectedColorId) {
        e.preventDefault()
        handleDuplicateSelected()
      }

      if (isMeta && (e.key === 'Delete' || e.key === 'Backspace') && selectedColorId) {
        e.preventDefault()
        handleDeleteSelected()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    selectedColorId,
    onShowAddModal,
    onShowFolderCreate,
    searchInputRef,
    setViewMode,
    setActiveSection,
    handleCopySelected,
    handleDuplicateSelected,
    handleDeleteSelected,
    handleToggleFavorite,
  ])
}
```

**注意点:**
- `⌘+C` は `selectedColorId` が存在する場合のみ発火。通常のテキストコピーと競合しないよう `isInput` チェック後に判定する
- `⌘+Delete` はMacで `Backspace` キーとして報告される場合があるため両方対応
- `⌘+F` だけは input 中でもブラウザデフォルト（Cmd+F検索）を上書きして検索バーフォーカスに使う

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## Task 2: `AppLayout.tsx` に useKeyboardShortcuts をマウント

**変更ファイル:** `src/components/layout/AppLayout.tsx`

変更点:
1. `searchInputRef` を作成して `Sidebar` 内の `SearchBar` に渡す（Task 2 では ref を AppLayout に保持し、SearchBar へ転送する設計）
2. `useKeyboardShortcuts` をマウント
3. フォルダロック状態を計算して `ListView`/`GalleryView` に `folderLocked` prop として渡す
4. フォルダ作成モーダルの ref を `FolderList` に渡すための `onShowFolderCreate` コールバックを定義

```typescript
import { useEffect, useRef, useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ListView } from '@/components/views/ListView'
import { GalleryView } from '@/components/views/GalleryView'
import { ViewToggle } from '@/components/views/ViewToggle'
import { FilterBar } from '@/components/views/FilterBar'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { AddColorModal } from '@/components/color/AddColorModal'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useFolderStore } from '@/store/folderStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

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
  const { folders, fetchFolders } = useFolderStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // フォルダロック判定
  const activeFolder = activeFolderId
    ? folders.find((f) => f.id === activeFolderId)
    : null
  const folderLocked = activeFolder?.is_locked ?? false

  useKeyboardShortcuts({
    onShowAddModal: () => setShowAddModal(true),
    onShowFolderCreate: () => {
      // FolderList の「＋」ボタンと同等の動作
      // Sidebar 内の FolderList に createMode を促すため、カスタムイベントを発火
      window.dispatchEvent(new CustomEvent('folder:create'))
    },
    searchInputRef,
  })

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  useEffect(() => {
    if (activeSection === 'favorites') {
      fetchColors()
    } else {
      fetchColors(activeFolderId)
    }
  }, [activeFolderId, activeSection, fetchColors])

  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? null

  const displayColors = activeSection === 'favorites'
    ? colors.filter((c) => c.is_favorite)
    : colors

  const sectionTitle =
    activeSection === 'favorites' ? 'お気に入り' :
    activeSection === 'history' ? '最近使った色' :
    activeSection === 'generator' ? 'カラージェネレーター' :
    'すべての色'

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-text-primary">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={[
        'fixed inset-y-0 left-0 z-30 transition-transform md:relative md:translate-x-0',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <Sidebar searchInputRef={searchInputRef} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            type="button"
            className="md:hidden text-text-secondary hover:text-text-primary"
          >
            ☰
          </button>
          <h1 className="text-sm font-medium text-text-primary flex-1">
            {sectionTitle}
            {folderLocked && (
              <span className="ml-2 text-xs text-text-muted">🔒</span>
            )}
          </h1>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <button
            onClick={() => setShowAddModal(true)}
            type="button"
            disabled={folderLocked}
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ＋ 追加
          </button>
        </header>

        <FilterBar />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {colorsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-text-muted text-sm">読み込み中...</p>
              </div>
            ) : viewMode === 'list' ? (
              <ListView colors={displayColors} folderLocked={folderLocked} />
            ) : (
              <GalleryView colors={displayColors} folderLocked={folderLocked} />
            )}
          </div>
          {isDetailPanelOpen && selectedColor && (
            <DetailPanel color={selectedColor} />
          )}
        </div>
      </div>

      {showAddModal && !folderLocked && (
        <AddColorModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}
```

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## Task 3: フォルダロック連動 — ListView / GalleryView に folderLocked prop を追加

### 3a: `src/components/views/ListView.tsx` に `folderLocked` prop を追加

**変更ファイル:** `src/components/views/ListView.tsx`

変更内容（`SortableColorItem` の props と `ListView` の interface）:

```typescript
// ListView の props interface に folderLocked を追加
interface ListViewProps {
  colors: Color[]
  folderLocked?: boolean
}

export function ListView({ colors, folderLocked = false }: ListViewProps) {
  // ...既存コード...

  return (
    <DndContext ...>
      <SortableContext ...>
        {colors.map((color) => (
          <SortableColorItem
            key={color.id}
            color={color}
            isSelected={selectedColorId === color.id}
            folderLocked={folderLocked}
            onSelect={() => setSelectedColorId(color.id)}
            onCopy={(e) => { e.stopPropagation(); /* copy logic */ }}
            onToggleFavorite={(e) => { e.stopPropagation(); updateColor(color.id, { is_favorite: !color.is_favorite }) }}
            onDelete={(e) => {
              e.stopPropagation()
              if (!color.is_locked && !folderLocked) deleteColor(color.id)
            }}
          />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

`ColorListItem` にも `folderLocked` を渡し、削除・編集ボタンの `disabled` 条件に `folderLocked || color.is_locked` を追加する。

### 3b: `src/components/views/GalleryView.tsx` に `folderLocked` prop を追加

```typescript
interface GalleryViewProps {
  colors: Color[]
  folderLocked?: boolean
}

export function GalleryView({ colors, folderLocked = false }: GalleryViewProps) {
  // 各アイテムの操作で folderLocked を考慮する
}
```

### 3c: `colorStore.addColor` でフォルダロックチェック

**変更ファイル:** `src/store/colorStore.ts`

`addColor` 関数の先頭に以下を追加（folderStoreは直接importせずパラメータで受け取る設計も可だが、シンプルにimportする）:

```typescript
import { useFolderStore } from '@/store/folderStore'

// addColor 内、user チェックの後に追加:
addColor: async (hex, alpha = 1.0, folderId = null) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // フォルダロックチェック
  if (folderId) {
    const folders = useFolderStore.getState().folders
    const folder = folders.find((f) => f.id === folderId)
    if (folder?.is_locked) {
      set({ error: 'このフォルダはロックされています' })
      return null
    }
  }

  // 以降は既存コード...
}
```

**注意:** Zustand store 間の参照は `useXxxStore.getState()` で行う（React の外側から呼べる）。

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## Task 4: `Sidebar` コンポーネントに `searchInputRef` を転送

**変更ファイル:** `src/components/sidebar/Sidebar.tsx`

`Sidebar` が `searchInputRef` を受け取り、`SearchBar` コンポーネントに転送する:

```typescript
import { RefObject } from 'react'

interface SidebarProps {
  searchInputRef?: RefObject<HTMLInputElement | null>
}

export function Sidebar({ searchInputRef }: SidebarProps) {
  // ...既存コード...
  return (
    <aside ...>
      <SearchBar ref={searchInputRef} value={...} onChange={...} />
      {/* 以降は既存コード */}
    </aside>
  )
}
```

`SearchBar` に `ref` を転送するため `forwardRef` を使う:

**変更ファイル:** `src/components/sidebar/SearchBar.tsx`

```typescript
import { forwardRef } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar({ value, onChange }, ref) {
    return (
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs">
          ⌘F
        </span>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="検索"
          className="w-full pl-9 pr-3 py-1.5 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>
    )
  }
)
```

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## Task 5: `electron/main.ts` に `⌘+Shift+C` を追加

**変更ファイル:** `electron/main.ts`

```typescript
app.whenReady().then(() => {
  const win = createWindow()

  // ⌘+Shift+P: アプリフォーカス（既存）
  const registered = globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (win.isMinimized()) win.restore()
    win.focus()
  })
  if (!registered) {
    console.warn('Failed to register global shortcut ⌘+Shift+P (may be in use by another app)')
  }

  // ⌘+Shift+C: スクリーンピッカー起動
  const registeredPicker = globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (win.isMinimized()) win.restore()
    win.focus()
    win.webContents.send('screen-picker:trigger')
  })
  if (!registeredPicker) {
    console.warn('Failed to register global shortcut ⌘+Shift+C (may be in use by another app)')
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
```

React側でのイベント受信（`src/hooks/useScreenPicker.ts` または既存のピッカーコンポーネント内）:

```typescript
// electron の preload.ts 経由で受け取る場合:
useEffect(() => {
  const handler = () => {
    // スクリーンピッカー起動ロジック
  }
  window.electron?.onScreenPickerTrigger?.(handler)
  return () => window.electron?.offScreenPickerTrigger?.(handler)
}, [])
```

**preload.ts にも追記が必要:** `screen-picker:trigger` チャンネルを `contextBridge` 経由で公開する。

**検証コマンド (Electronビルド):**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## 実装後の動作確認チェックリスト

- [ ] `⌘+N` でAddColorModalが開く
- [ ] `⌘+Shift+N` でサイドバーのフォルダ作成が起動する
- [ ] `⌘+1` / `⌘+2` でビューが切り替わる
- [ ] `⌘+F` で検索バーにフォーカスが移る（input中でも動作する）
- [ ] `⌘+C` で選択中の色のHEXがクリップボードにコピーされる
- [ ] `⌘+D` で選択中の色が複製される（ロック中は動作しない）
- [ ] `⌘+Delete` で選択中の色が削除される（ロック中は動作しない）
- [ ] `⌘+G` でカラージェネレーターセクションに切り替わる
- [ ] ロック中フォルダを選択中は「＋追加」ボタンが無効化される
- [ ] ロック中フォルダを選択中は各色の削除・編集ボタンが無効化される
- [ ] `colorStore.addColor` でロック中フォルダへの追加が拒否される
- [ ] `electron/main.ts` で `⌘+Shift+C` を登録し、Reactに `screen-picker:trigger` が届く

---

## コミットコマンド

```bash
git add src/hooks/useKeyboardShortcuts.ts \
        src/components/layout/AppLayout.tsx \
        src/components/views/ListView.tsx \
        src/components/views/GalleryView.tsx \
        src/components/sidebar/SearchBar.tsx \
        src/components/sidebar/Sidebar.tsx \
        src/store/colorStore.ts \
        electron/main.ts
git commit -m "$(cat <<'EOF'
feat: add in-app keyboard shortcuts and folder lock propagation

- useKeyboardShortcuts hook: ⌘N/⌘D/⌘Delete/⌘C/⌘F/⌘1/⌘2/⌘G/⌘Shift+N
- AppLayout: mount hook, derive folderLocked from active folder state
- ListView/GalleryView: accept folderLocked prop, disable edit/delete
- colorStore.addColor: guard against locked folder
- electron/main.ts: register ⌘+Shift+C for screen picker trigger
- SearchBar: forwardRef for external focus control

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
