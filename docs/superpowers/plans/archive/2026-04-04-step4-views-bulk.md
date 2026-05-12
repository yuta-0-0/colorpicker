# Step 4 — リストビュー・ギャラリービュー・アーカイブ・バルク操作

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## 概要

FilterBar の色相フィルターを実際に動作させ、バルク選択・一括操作を実装する。

## すでに完了済み（再実装しない）

- ListView（dnd-kit ドラッグソート付き）
- GalleryView（色相ソート付き）
- FilterBar UI（色相ボタン + アーカイブトグルは存在するが、色相フィルターは未接続）
- `uiStore.showArchived`
- `colorStore` の `updateColor`、`deleteColor`

## 実装する内容

1. `uiStore` に `activeHueFilter` と `bulkSelectedIds` を追加
2. FilterBar を uiStore に接続して色相フィルターを動作させる
3. AppLayout で `displayColors` を色相でフィルタリング
4. `BulkActionBar` コンポーネントを新規作成
5. ListView / GalleryView 各アイテムにチェックボックスを追加

---

## Task 1 — uiStore に hueFilter・bulkSelect を追加

**変更ファイル:**
- `src/store/uiStore.ts`（変更）

**実装手順:**

- [ ] `src/store/uiStore.ts` を開く
- [ ] `UIStore` インターフェースに以下を追加する

```typescript
// 色相フィルター
activeHueFilter: string | null
setActiveHueFilter: (hue: string | null) => void

// バルク選択
bulkSelectedIds: string[]
toggleBulkSelect: (id: string) => void
clearBulkSelect: () => void
isBulkMode: boolean
```

- [ ] `create<UIStore>` の初期値と実装を追加する

完成後の `src/store/uiStore.ts` 全文:

```typescript
import { create } from 'zustand'

export type ViewMode = 'list' | 'gallery'
export type NavSection = 'all' | 'favorites' | 'history' | 'generator'

interface UIStore {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  selectedColorId: string | null
  setSelectedColorId: (id: string | null) => void

  isDetailPanelOpen: boolean
  setIsDetailPanelOpen: (open: boolean) => void

  isSidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  activeSection: NavSection
  setActiveSection: (section: NavSection) => void

  activeFolderId: string | null
  setActiveFolderId: (id: string | null) => void

  showArchived: boolean
  setShowArchived: (show: boolean) => void

  // 色相フィルター
  activeHueFilter: string | null
  setActiveHueFilter: (hue: string | null) => void

  // バルク選択
  bulkSelectedIds: string[]
  toggleBulkSelect: (id: string) => void
  clearBulkSelect: () => void
  isBulkMode: boolean
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),

  selectedColorId: null,
  setSelectedColorId: (id) => set({ selectedColorId: id, isDetailPanelOpen: id !== null }),

  isDetailPanelOpen: false,
  setIsDetailPanelOpen: (open) => set({ isDetailPanelOpen: open }),

  isSidebarOpen: false,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  activeSection: 'all',
  setActiveSection: (section) => set({ activeSection: section, activeFolderId: null }),

  activeFolderId: null,
  setActiveFolderId: (id) => set({ activeFolderId: id, activeSection: 'all' }),

  showArchived: false,
  setShowArchived: (show) => set({ showArchived: show }),

  // 色相フィルター
  activeHueFilter: null,
  setActiveHueFilter: (hue) => set({ activeHueFilter: hue }),

  // バルク選択
  bulkSelectedIds: [],
  isBulkMode: false,
  toggleBulkSelect: (id) =>
    set((state) => {
      const exists = state.bulkSelectedIds.includes(id)
      const next = exists
        ? state.bulkSelectedIds.filter((x) => x !== id)
        : [...state.bulkSelectedIds, id]
      return { bulkSelectedIds: next, isBulkMode: next.length > 0 }
    }),
  clearBulkSelect: () => set({ bulkSelectedIds: [], isBulkMode: false }),
}))
```

- [ ] 型チェックを実行する
  ```bash
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
  ```
- [ ] エラーがなければコミットする（`dangerouslyDisableSandbox: true` 必要）
  ```bash
  git add src/store/uiStore.ts && git commit -m "feat: add activeHueFilter and bulkSelectedIds to uiStore"
  ```

---

## Task 2 — FilterBar を接続（色相フィルター動作）

**変更ファイル:**
- `src/components/views/FilterBar.tsx`（変更）

**実装手順:**

- [ ] `src/components/views/FilterBar.tsx` を開く
- [ ] `useUIStore` から `activeHueFilter`、`setActiveHueFilter` を取得する
- [ ] 各色相ボタンのクリックで `setActiveHueFilter` をトグル呼び出しにする（同じラベルを再クリックしたら null に戻す）
- [ ] アクティブな色相ボタンにハイライトスタイルを適用する

完成後の `src/components/views/FilterBar.tsx` 全文:

```typescript
import { useUIStore } from '@/store/uiStore'

const HUE_FILTERS = [
  { label: '赤', hex: '#ef4444' },
  { label: '橙', hex: '#f97316' },
  { label: '黄', hex: '#eab308' },
  { label: '緑', hex: '#22c55e' },
  { label: '青', hex: '#3b82f6' },
  { label: '紫', hex: '#a855f7' },
  { label: 'ピンク', hex: '#ec4899' },
  { label: '無彩色', hex: '#888888' },
]

export function FilterBar() {
  const { showArchived, setShowArchived, activeHueFilter, setActiveHueFilter } = useUIStore()

  const handleHueClick = (label: string) => {
    setActiveHueFilter(activeHueFilter === label ? null : label)
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border overflow-x-auto flex-shrink-0">
      {HUE_FILTERS.map((filter) => {
        const isActive = activeHueFilter === filter.label
        return (
          <button
            key={filter.label}
            type="button"
            onClick={() => handleHueClick(filter.label)}
            className={[
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors flex-shrink-0',
              isActive
                ? 'bg-surface-overlay text-text-primary ring-1 ring-border'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay',
            ].join(' ')}
          >
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: filter.hex }} />
            {filter.label}
          </button>
        )
      })}
      <div className="ml-auto flex-shrink-0">
        <button
          onClick={() => setShowArchived(!showArchived)}
          type="button"
          className={[
            'px-2 py-1 rounded-full text-xs transition-colors',
            showArchived
              ? 'bg-surface-overlay text-text-primary'
              : 'text-text-muted hover:text-text-secondary',
          ].join(' ')}
        >
          アーカイブ {showArchived ? '非表示' : '表示'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] 型チェックを実行する
  ```bash
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
  ```
- [ ] コミットする（`dangerouslyDisableSandbox: true` 必要）
  ```bash
  git add src/components/views/FilterBar.tsx && git commit -m "feat: connect hue filter buttons to uiStore.activeHueFilter"
  ```

---

## Task 3 — AppLayout で hue フィルタリングを適用

**変更ファイル:**
- `src/components/layout/AppLayout.tsx`（変更）

**実装手順:**

- [ ] `src/components/layout/AppLayout.tsx` を開く
- [ ] `useUIStore` から `activeHueFilter` を取得する
- [ ] `getHueCategory` ヘルパー関数を AppLayout ファイル内に追加する（GalleryView の `getHue` とは別実装）
- [ ] `displayColors` の算出ロジックに `activeHueFilter` によるフィルタリングを追加する
- [ ] `BulkActionBar` のインポート行を追加しておく（Task 4 で実装するが、インポートは先に書いておく）

完成後の `src/components/layout/AppLayout.tsx` 全文:

```typescript
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ListView } from '@/components/views/ListView'
import { GalleryView } from '@/components/views/GalleryView'
import { ViewToggle } from '@/components/views/ViewToggle'
import { FilterBar } from '@/components/views/FilterBar'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { AddColorModal } from '@/components/color/AddColorModal'
import { BulkActionBar } from '@/components/ui/BulkActionBar'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useFolderStore } from '@/store/folderStore'

// 色相カテゴリを返す（FilterBar の HUE_FILTERS ラベルと一致させる）
function getHueCategory(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const s = max === 0 ? 0 : (max - min) / max
  if (s < 0.12) return '無彩色'
  const d = max - min
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = Math.round(h * 60 + (h < 0 ? 360 : 0))
  if (h < 20 || h >= 340) return '赤'
  if (h < 45) return '橙'
  if (h < 70) return '黄'
  if (h < 160) return '緑'
  if (h < 250) return '青'
  if (h < 290) return '紫'
  return 'ピンク'
}

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
    activeHueFilter,
    isBulkMode,
  } = useUIStore()

  const { colors, loading: colorsLoading, fetchColors } = useColorStore()
  const { fetchFolders } = useFolderStore()
  const [showAddModal, setShowAddModal] = useState(false)

  // 初回データ取得
  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  // フォルダ・セクション変更時にデータ再取得
  useEffect(() => {
    if (activeSection === 'favorites') {
      fetchColors()
    } else {
      fetchColors(activeFolderId)
    }
  }, [activeFolderId, activeSection, fetchColors])

  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? null

  // お気に入りフィルター → 色相フィルター の順に適用
  const baseColors = activeSection === 'favorites'
    ? colors.filter((c) => c.is_favorite)
    : colors

  const displayColors = activeHueFilter
    ? baseColors.filter((c) => getHueCategory(c.hex) === activeHueFilter)
    : baseColors

  const sectionTitle =
    activeSection === 'favorites' ? 'お気に入り' :
    activeSection === 'history' ? '最近使った色' :
    activeSection === 'generator' ? 'カラージェネレーター' :
    'すべての色'

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
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <button
            onClick={() => setShowAddModal(true)}
            type="button"
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
          >
            ＋ 追加
          </button>
        </header>

        <FilterBar />

        <div className="flex-1 flex flex-col overflow-hidden">
          {isBulkMode && <BulkActionBar />}

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              {colorsLoading ? (
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
      </div>

      {showAddModal && <AddColorModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
```

- [ ] 型チェックを実行する（BulkActionBar が未作成のためエラーになる場合は Task 4 完了後に再確認）
  ```bash
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
  ```
- [ ] コミットは Task 4 完了後にまとめてコミットする

---

## Task 4 — BulkActionBar を新規作成

**作成ファイル:**
- `src/components/ui/BulkActionBar.tsx`（新規）

**実装手順:**

- [ ] `src/components/ui/` ディレクトリに `BulkActionBar.tsx` を新規作成する
- [ ] `bulkSelectedIds`・`clearBulkSelect` を `useUIStore` から取得する
- [ ] `deleteColor`・`updateColor` を `useColorStore` から取得する
- [ ] `useFolderStore` から `folders` を取得してフォルダ移動ドロップダウンを作る
- [ ] 一括削除ボタン：ロック済みの色はスキップする（`is_locked` チェック）
- [ ] 一括アーカイブボタン：`is_archived: true` に更新
- [ ] 一括フォルダ移動：フォルダ一覧をドロップダウンで表示し、選択したフォルダIDに `folder_id` を更新
- [ ] 操作完了後は `clearBulkSelect` を呼ぶ

完成後の `src/components/ui/BulkActionBar.tsx` 全文:

```typescript
import { useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useFolderStore } from '@/store/folderStore'

export function BulkActionBar() {
  const { bulkSelectedIds, clearBulkSelect } = useUIStore()
  const { colors, deleteColor, updateColor } = useColorStore()
  const { folders } = useFolderStore()
  const [showFolderMenu, setShowFolderMenu] = useState(false)

  const count = bulkSelectedIds.length

  const handleBulkDelete = async () => {
    for (const id of bulkSelectedIds) {
      const color = colors.find((c) => c.id === id)
      if (color && !color.is_locked) {
        await deleteColor(id)
      }
    }
    clearBulkSelect()
  }

  const handleBulkArchive = async () => {
    for (const id of bulkSelectedIds) {
      await updateColor(id, { is_archived: true })
    }
    clearBulkSelect()
  }

  const handleBulkMoveToFolder = async (folderId: string | null) => {
    for (const id of bulkSelectedIds) {
      await updateColor(id, { folder_id: folderId })
    }
    clearBulkSelect()
    setShowFolderMenu(false)
  }

  return (
    <div className="relative flex items-center gap-2 px-4 py-2 bg-surface-overlay border-b border-border flex-shrink-0">
      <span className="text-xs text-text-secondary mr-2">
        {count}件選択中
      </span>

      <button
        type="button"
        onClick={handleBulkDelete}
        className="px-3 py-1 text-xs rounded-md bg-red-900/40 text-red-300 hover:bg-red-900/60 transition-colors"
      >
        一括削除
      </button>

      <button
        type="button"
        onClick={handleBulkArchive}
        className="px-3 py-1 text-xs rounded-md bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors border border-border"
      >
        一括アーカイブ
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowFolderMenu((v) => !v)}
          className="px-3 py-1 text-xs rounded-md bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors border border-border"
        >
          フォルダ移動 ▾
        </button>
        {showFolderMenu && (
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-lg border border-border bg-surface-overlay shadow-lg py-1">
            <button
              type="button"
              onClick={() => handleBulkMoveToFolder(null)}
              className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
            >
              フォルダなし
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => handleBulkMoveToFolder(folder.id)}
                className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
              >
                {folder.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={clearBulkSelect}
        className="ml-auto text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        キャンセル
      </button>
    </div>
  )
}
```

- [ ] 型チェックを実行する
  ```bash
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
  ```
- [ ] Task 3 と Task 4 をまとめてコミットする（`dangerouslyDisableSandbox: true` 必要）
  ```bash
  git add src/components/layout/AppLayout.tsx src/components/ui/BulkActionBar.tsx && git commit -m "feat: add hue filtering in AppLayout and BulkActionBar component"
  ```

---

## Task 5 — ListView / GalleryView にチェックボックスを追加

**変更ファイル:**
- `src/components/views/ListView.tsx`（変更）
- `src/components/views/GalleryView.tsx`（変更）

### 5-A: ListView にチェックボックスを追加

**実装手順:**

- [ ] `src/components/views/ListView.tsx` を開く
- [ ] `useUIStore` から `bulkSelectedIds`・`toggleBulkSelect`・`isBulkMode` を取得する
- [ ] `SortableColorItem` に `isChecked: boolean`、`onCheck: () => void` プロップを追加する
- [ ] ドラッグハンドルの左にチェックボックスを追加する（`isBulkMode` のときは常時表示、それ以外はホバー時のみ表示）
- [ ] チェックボックスをクリックしたとき `toggleBulkSelect` を呼ぶ（イベントのバブリングを止める）

完成後の `src/components/views/ListView.tsx` 全文:

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ColorListItem } from '@/components/color/ColorListItem'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import type { Color } from '@/types/database'

function SortableColorItem({
  color,
  isSelected,
  isChecked,
  isBulkMode,
  onSelect,
  onCheck,
  onCopy,
  onToggleFavorite,
  onDelete,
}: {
  color: Color
  isSelected: boolean
  isChecked: boolean
  isBulkMode: boolean
  onSelect: () => void
  onCheck: () => void
  onCopy: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: color.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group/drag flex items-center"
    >
      {/* チェックボックス：バルクモード中は常時表示、それ以外はホバー時のみ */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCheck() }}
        className={[
          'flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-opacity mr-0.5',
          isBulkMode
            ? 'opacity-100'
            : 'opacity-0 group-hover/drag:opacity-100',
          isChecked
            ? 'bg-accent text-white'
            : 'border border-border text-transparent hover:border-text-muted',
        ].join(' ')}
        title="選択"
      >
        {isChecked && (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span
        {...attributes}
        {...listeners}
        className="flex-shrink-0 w-5 flex items-center justify-center text-text-muted opacity-0 group-hover/drag:opacity-100 cursor-grab active:cursor-grabbing transition-opacity text-xs select-none"
        title="ドラッグで並び替え"
      >
        ⠿
      </span>
      <div className="flex-1 min-w-0">
        <ColorListItem
          color={color}
          isSelected={isSelected}
          onSelect={onSelect}
          onCopy={onCopy}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}

interface ListViewProps {
  colors: Color[]
}

export function ListView({ colors }: ListViewProps) {
  const { selectedColorId, setSelectedColorId, showArchived, bulkSelectedIds, toggleBulkSelect, isBulkMode } = useUIStore()
  const { updateColor, deleteColor, incrementUsedCount, reorderColors } = useColorStore()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const visibleColors = showArchived ? colors : colors.filter((c) => !c.is_archived)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = visibleColors.findIndex((c) => c.id === active.id)
    const newIndex = visibleColors.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(visibleColors, oldIndex, newIndex)
    reorderColors(reordered.map((c) => c.id))
  }

  const handleCopy = (color: Color, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(color.hex)
    incrementUsedCount(color.id)
  }

  const handleToggleFavorite = (color: Color, e: React.MouseEvent) => {
    e.stopPropagation()
    updateColor(color.id, { is_favorite: !color.is_favorite })
  }

  const handleDelete = (color: Color, e: React.MouseEvent) => {
    e.stopPropagation()
    if (color.is_locked) return
    deleteColor(color.id)
    if (selectedColorId === color.id) setSelectedColorId(null)
  }

  if (visibleColors.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted text-sm">色がありません</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleColors.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {visibleColors.map((color) => (
            <SortableColorItem
              key={color.id}
              color={color}
              isSelected={selectedColorId === color.id}
              isChecked={bulkSelectedIds.includes(color.id)}
              isBulkMode={isBulkMode}
              onSelect={() => setSelectedColorId(color.id)}
              onCheck={() => toggleBulkSelect(color.id)}
              onCopy={(e) => handleCopy(color, e)}
              onToggleFavorite={(e) => handleToggleFavorite(color, e)}
              onDelete={(e) => handleDelete(color, e)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

### 5-B: GalleryView にチェックボックスを追加

**実装手順:**

- [ ] `src/components/views/GalleryView.tsx` を開く
- [ ] `useUIStore` から `bulkSelectedIds`・`toggleBulkSelect`・`isBulkMode` を取得する
- [ ] 各 `ColorGalleryItem` のラッパーに相対配置のチェックボックスを重ねる
- [ ] チェックボックスは右上に配置（`absolute top-0 right-0`）
- [ ] `isBulkMode` のときは常時表示、それ以外はホバー時のみ表示

完成後の `src/components/views/GalleryView.tsx` 全文:

```typescript
import { ColorGalleryItem } from '@/components/color/ColorGalleryItem'
import { useUIStore } from '@/store/uiStore'
import type { Color } from '@/types/database'

function getHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  if (d === 0) return 0
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return Math.round(h * 60 + (h < 0 ? 360 : 0))
}

interface GalleryViewProps { colors: Color[] }

export function GalleryView({ colors }: GalleryViewProps) {
  const { selectedColorId, setSelectedColorId, showArchived, bulkSelectedIds, toggleBulkSelect, isBulkMode } = useUIStore()

  // showArchived フィルターは AppLayout の displayColors が既に hue フィルタリング済み
  // アーカイブの表示制御は ListView と同様にここでも行う
  const visibleColors = (showArchived ? colors : colors.filter((c) => !c.is_archived))
    .slice().sort((a, b) => getHue(a.hex) - getHue(b.hex))

  if (visibleColors.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted text-sm">色がありません</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-wrap gap-4">
        {visibleColors.map((color) => {
          const isChecked = bulkSelectedIds.includes(color.id)
          return (
            <div key={color.id} className="relative group/gallery">
              <ColorGalleryItem
                color={color}
                isSelected={selectedColorId === color.id}
                onSelect={() => setSelectedColorId(color.id)}
              />
              {/* チェックボックス：バルクモード中は常時表示、それ以外はホバー時のみ */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleBulkSelect(color.id) }}
                className={[
                  'absolute top-0 right-0 w-4 h-4 rounded flex items-center justify-center transition-opacity',
                  isBulkMode
                    ? 'opacity-100'
                    : 'opacity-0 group-hover/gallery:opacity-100',
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] 型チェックを実行する
  ```bash
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
  ```
- [ ] エラーがなければコミットする（`dangerouslyDisableSandbox: true` 必要）
  ```bash
  git add src/components/views/ListView.tsx src/components/views/GalleryView.tsx && git commit -m "feat: add bulk select checkboxes to ListView and GalleryView"
  ```

---

## 動作確認チェックリスト

- [ ] FilterBar の色相ボタンをクリックするとその系統の色だけ表示される
- [ ] 同じボタンを再クリックするとフィルター解除されて全色表示に戻る
- [ ] アーカイブ表示トグルが引き続き動作する
- [ ] リストビューで色アイテムにホバーするとチェックボックスが現れる
- [ ] チェックボックスをクリックすると BulkActionBar が上部に出現する
- [ ] BulkActionBar の「一括削除」でロックされていない選択色が削除される
- [ ] BulkActionBar の「一括アーカイブ」で選択色がアーカイブされる
- [ ] BulkActionBar の「フォルダ移動」でドロップダウンが出てフォルダを選べる
- [ ] 「キャンセル」でバルク選択が解除される
- [ ] ギャラリービューでも同様のチェックボックス・バルク操作が動作する
- [ ] 型チェックがエラーなしで通る

---

## 完了後の作業

```
GitHubにpushするタイミングです。ターミナルで以下を実行してください：
cd ~/Projects/apps/colorpicker
git push
```
