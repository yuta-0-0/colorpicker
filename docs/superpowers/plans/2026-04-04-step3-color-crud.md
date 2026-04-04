# Step 3: カラー管理CRUD・フォルダ機能・ドラッグ並び替え Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** モックデータをSupabaseの実データに差し替え、色とフォルダのCRUD・ドラッグ並び替えを実装する。

**Architecture:** Zustand の colorStore・folderStore でSupabaseデータを管理。useColors・useFolders フックでCRUD操作をカプセル化。@dnd-kit でドラッグ並び替えを実装。既存のUIコンポーネントはprops経由でデータを受け取るため、大幅な変更は不要。

**Tech Stack:** Zustand, Supabase JS v2, @dnd-kit/core, @dnd-kit/sortable

---

## ファイル構成

```
src/
├── store/
│   ├── uiStore.ts               # 変更なし
│   ├── colorStore.ts            # 新規：色データ・CRUD操作
│   └── folderStore.ts           # 新規：フォルダデータ・CRUD操作
├── hooks/
│   └── useHexName.ts            # 新規：nearest-color で色名を自動生成
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx        # 修正：モックデータ→colorStore
│   ├── sidebar/
│   │   ├── FolderList.tsx       # 修正：モックデータ→folderStore＋ドラッグ
│   │   └── Sidebar.tsx          # 修正：色の総数をcolorStoreから取得
│   ├── views/
│   │   ├── ListView.tsx         # 修正：ドラッグ並び替え対応
│   │   └── GalleryView.tsx      # 修正：ドラッグ並び替え対応
│   ├── color/
│   │   └── AddColorModal.tsx    # 新規：色追加モーダル（HEX/RGB/HSL入力）
│   └── detail/
│       └── DetailPanel.tsx      # 修正：名前・メモ・お気に入り・ロック編集
└── lib/
    └── colorUtils.ts            # 新規：HEX→色名変換（nearest-color）
```

---

### Task 1: 依存関係追加（@dnd-kit・nearest-color）

**Files:**
- Modify: `package.json`

- [ ] **Step 1: パッケージをインストールする**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities nearest-color color-name-list
npm install --save-dev @types/color-name-list 2>/dev/null || true
```

期待される出力: エラーなし

- [ ] **Step 2: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add package.json package-lock.json
git commit -m "chore: add dnd-kit and nearest-color dependencies"
```

---

### Task 2: カラーユーティリティ（色名自動生成）

**Files:**
- Create: `src/lib/colorUtils.ts`

- [ ] **Step 1: src/lib/colorUtils.ts を作成する**

nearest-color で HEX から色名を自動生成する。`color-name-list` が提供する英語名を日本語にマッピングする簡易辞書も持つ。

```typescript
// nearest-color は CommonJS モジュールのため dynamic import で対応
let nearestColorFn: ((hex: string) => { name: string; value: string } | null) | null = null

async function getNearestColor() {
  if (nearestColorFn) return nearestColorFn
  const nearestColor = (await import('nearest-color')).default
  const { default: colorNameList } = await import('color-name-list')
  const colors: Record<string, string> = {}
  for (const c of colorNameList) {
    colors[c.name] = c.hex
  }
  nearestColorFn = nearestColor.from(colors)
  return nearestColorFn
}

export async function getColorName(hex: string): Promise<string> {
  try {
    const fn = await getNearestColor()
    const result = fn?.(hex)
    return result?.name ?? hex
  } catch {
    return hex
  }
}

// HEXフォーマットバリデーション
export function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

// RGB文字列 → HEX変換（例: "rgb(255, 0, 0)" → "#ff0000"）
export function rgbStringToHex(rgb: string): string | null {
  const match = rgb.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/)
  if (!match) return null
  const r = parseInt(match[1]).toString(16).padStart(2, '0')
  const g = parseInt(match[2]).toString(16).padStart(2, '0')
  const b = parseInt(match[3]).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

// HSL文字列 → HEX変換（例: "hsl(0, 100%, 50%)" → "#ff0000"）
export function hslStringToHex(hsl: string): string | null {
  const match = hsl.match(/hsl\(\s*(\d+),\s*(\d+)%,\s*(\d+)%\s*\)/)
  if (!match) return null
  const h = parseInt(match[1]) / 360
  const s = parseInt(match[2]) / 100
  const l = parseInt(match[3]) / 100

  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// 入力文字列を正規化して HEX に変換（#RRGGBB / rgb() / hsl() に対応）
export function normalizeToHex(input: string): string | null {
  const trimmed = input.trim()
  if (isValidHex(trimmed)) return trimmed.toUpperCase()
  const fromRgb = rgbStringToHex(trimmed)
  if (fromRgb) return fromRgb.toUpperCase()
  const fromHsl = hslStringToHex(trimmed)
  if (fromHsl) return fromHsl.toUpperCase()
  return null
}
```

- [ ] **Step 2: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/lib/colorUtils.ts
git commit -m "feat: add color name generation and hex conversion utilities"
```

---

### Task 3: colorStore（Supabaseデータ管理）

**Files:**
- Create: `src/store/colorStore.ts`

- [ ] **Step 1: src/store/colorStore.ts を作成する**

```typescript
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { getColorName } from '@/lib/colorUtils'
import type { Color, ColorInsert, ColorUpdate } from '@/types/database'

interface ColorStore {
  colors: Color[]
  loading: boolean
  error: string | null

  // データ取得
  fetchColors: (folderId?: string | null) => Promise<void>

  // 色追加（同一HEXは重複しない）
  addColor: (hex: string, alpha?: number, folderId?: string | null) => Promise<Color | null>

  // 色更新（名前・メモ・お気に入り・ロック・アーカイブ等）
  updateColor: (id: string, updates: ColorUpdate) => Promise<void>

  // 色削除
  deleteColor: (id: string) => Promise<void>

  // コピー時のused_count更新
  incrementUsedCount: (id: string) => Promise<void>

  // ドラッグ並び替え後の順序保存
  reorderColors: (orderedIds: string[]) => Promise<void>
}

export const useColorStore = create<ColorStore>((set, get) => ({
  colors: [],
  loading: false,
  error: null,

  fetchColors: async (folderId) => {
    set({ loading: true, error: null })
    try {
      let query = supabase
        .from('colors')
        .select('*')
        .order('order', { ascending: true })
        .order('updated_at', { ascending: false })

      if (folderId !== undefined) {
        if (folderId === null) {
          query = query.is('folder_id', null)
        } else {
          query = query.eq('folder_id', folderId)
        }
      }

      const { data, error } = await query
      if (error) throw error
      set({ colors: data ?? [], loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  addColor: async (hex, alpha = 1.0, folderId = null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 同一HEXが既に存在するか確認
    const existing = get().colors.find((c) => c.hex.toUpperCase() === hex.toUpperCase())
    if (existing) {
      // updated_atを更新してリスト最上部へ
      const { error } = await supabase
        .from('colors')
        .update({ updated_at: new Date().toISOString(), order: -1 })
        .eq('id', existing.id)
      if (!error) {
        await get().fetchColors(folderId)
      }
      return existing
    }

    // 新規追加
    const name = await getColorName(hex)
    const newColor: ColorInsert = {
      user_id: user.id,
      folder_id: folderId,
      hex: hex.toUpperCase(),
      alpha,
      name,
      order: 0,
    }

    const { data, error } = await supabase
      .from('colors')
      .insert(newColor)
      .select()
      .single()

    if (error) {
      if (error.message.includes('COLOR_LIMIT_EXCEEDED')) {
        set({ error: '保存できる色の上限（500色）に達しています' })
      } else {
        set({ error: error.message })
      }
      return null
    }

    set((state) => ({ colors: [data, ...state.colors] }))
    return data
  },

  updateColor: async (id, updates) => {
    const { error } = await supabase
      .from('colors')
      .update(updates)
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      colors: state.colors.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }))
  },

  deleteColor: async (id) => {
    const { error } = await supabase
      .from('colors')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      colors: state.colors.filter((c) => c.id !== id),
    }))
  },

  incrementUsedCount: async (id) => {
    const color = get().colors.find((c) => c.id === id)
    if (!color) return

    const newCount = color.used_count + 1
    const { error } = await supabase
      .from('colors')
      .update({ used_count: newCount, last_used_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      set((state) => ({
        colors: state.colors.map((c) =>
          c.id === id ? { ...c, used_count: newCount, last_used_at: new Date().toISOString() } : c
        ),
      }))
    }
  },

  reorderColors: async (orderedIds) => {
    // 楽観的更新：先にUIを更新
    set((state) => {
      const colorMap = new Map(state.colors.map((c) => [c.id, c]))
      const reordered = orderedIds
        .map((id) => colorMap.get(id))
        .filter((c): c is Color => c !== undefined)
      return { colors: reordered }
    })

    // Supabaseに順序を保存
    const updates = orderedIds.map((id, index) => ({
      id,
      order: index,
    }))

    for (const update of updates) {
      await supabase
        .from('colors')
        .update({ order: update.order })
        .eq('id', update.id)
    }
  },
}))
```

- [ ] **Step 2: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/store/colorStore.ts
git commit -m "feat: add colorStore with Supabase CRUD operations"
```

---

### Task 4: folderStore（フォルダCRUD）

**Files:**
- Create: `src/store/folderStore.ts`

- [ ] **Step 1: src/store/folderStore.ts を作成する**

```typescript
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Folder, FolderInsert } from '@/types/database'

interface FolderStore {
  folders: Folder[]
  loading: boolean
  error: string | null

  fetchFolders: () => Promise<void>
  createFolder: (name: string) => Promise<Folder | null>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  toggleFolderLock: (id: string, isLocked: boolean) => Promise<void>
  reorderFolders: (orderedIds: string[]) => Promise<void>
}

export const useFolderStore = create<FolderStore>((set, get) => ({
  folders: [],
  loading: false,
  error: null,

  fetchFolders: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('order', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ folders: data ?? [], loading: false })
  },

  createFolder: async (name) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const maxOrder = get().folders.reduce((max, f) => Math.max(max, f.order), -1)
    const newFolder: FolderInsert = {
      user_id: user.id,
      name,
      order: maxOrder + 1,
    }

    const { data, error } = await supabase
      .from('folders')
      .insert(newFolder)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    set((state) => ({ folders: [...state.folders, data] }))
    return data
  },

  renameFolder: async (id, name) => {
    const { error } = await supabase
      .from('folders')
      .update({ name })
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, name } : f
      ),
    }))
  },

  deleteFolder: async (id) => {
    // フォルダ削除時、中の色の folder_id は SET NULL（DBの ON DELETE SET NULL）
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
    }))
  },

  toggleFolderLock: async (id, isLocked) => {
    const { error } = await supabase
      .from('folders')
      .update({ is_locked: isLocked })
      .eq('id', id)

    if (!error) {
      set((state) => ({
        folders: state.folders.map((f) =>
          f.id === id ? { ...f, is_locked: isLocked } : f
        ),
      }))
    }
  },

  reorderFolders: async (orderedIds) => {
    set((state) => {
      const folderMap = new Map(state.folders.map((f) => [f.id, f]))
      const reordered = orderedIds
        .map((id) => folderMap.get(id))
        .filter((f): f is Folder => f !== undefined)
      return { folders: reordered }
    })

    for (const [index, id] of orderedIds.entries()) {
      await supabase
        .from('folders')
        .update({ order: index })
        .eq('id', id)
    }
  },
}))
```

- [ ] **Step 2: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/store/folderStore.ts
git commit -m "feat: add folderStore with Supabase CRUD operations"
```

---

### Task 5: 色追加モーダル

**Files:**
- Create: `src/components/color/AddColorModal.tsx`

- [ ] **Step 1: src/components/color/AddColorModal.tsx を作成する**

HEX / RGB / HSL を入力して色を追加するモーダル。不正な値はリアルタイムで赤枠表示し、保存ボタンを非活性にする。

```typescript
import { useState, useEffect } from 'react'
import { ColorSwatch } from './ColorSwatch'
import { useColorStore } from '@/store/colorStore'
import { useUIStore } from '@/store/uiStore'
import { normalizeToHex, isValidHex } from '@/lib/colorUtils'

interface AddColorModalProps {
  onClose: () => void
}

export function AddColorModal({ onClose }: AddColorModalProps) {
  const [input, setInput] = useState('')
  const [previewHex, setPreviewHex] = useState<string | null>(null)
  const [isInvalid, setIsInvalid] = useState(false)
  const [saving, setSaving] = useState(false)
  const { addColor } = useColorStore()
  const { activeFolderId } = useUIStore()

  useEffect(() => {
    if (!input.trim()) {
      setPreviewHex(null)
      setIsInvalid(false)
      return
    }
    const hex = normalizeToHex(input.trim())
    if (hex) {
      setPreviewHex(hex)
      setIsInvalid(false)
    } else {
      setPreviewHex(null)
      setIsInvalid(true)
    }
  }, [input])

  const handleSave = async () => {
    if (!previewHex) return
    setSaving(true)
    await addColor(previewHex, 1.0, activeFolderId)
    setSaving(false)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && previewHex) handleSave()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-surface-raised border border-border rounded-2xl p-6 w-80 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-medium text-text-primary mb-4">色を追加</h2>

        {/* プレビュー */}
        <div className="flex justify-center mb-4">
          {previewHex ? (
            <ColorSwatch hex={previewHex} size="lg" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-surface-overlay border-2 border-dashed border-border" />
          )}
        </div>

        {/* 入力フィールド */}
        <div className="mb-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="#3A7BD5 / rgb(58,123,213) / hsl(220,63%,53%)"
            autoFocus
            className={[
              'w-full px-3 py-2 bg-surface-overlay rounded-lg text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none transition-colors',
              isInvalid ? 'border-2 border-danger' : 'border border-border focus:border-accent',
            ].join(' ')}
          />
        </div>
        {isInvalid && (
          <p className="text-xs text-danger mb-3">HEX（#RRGGBB）、rgb()、hsl() 形式で入力してください</p>
        )}

        <p className="text-xs text-text-muted mb-4">HEX / RGB / HSL 形式に対応しています</p>

        {/* ボタン */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            type="button"
            className="flex-1 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary border border-border hover:bg-surface-overlay transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!previewHex || saving}
            type="button"
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '追加中...' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/color/AddColorModal.tsx
git commit -m "feat: add color input modal with HEX/RGB/HSL validation"
```

---

### Task 6: ListView にドラッグ並び替えを追加

**Files:**
- Modify: `src/components/views/ListView.tsx`

- [ ] **Step 1: src/components/views/ListView.tsx を全面更新する**

まず現在のファイルを読んでから、以下の完全版に差し替える。

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

// ドラッグ可能なラッパー
function SortableColorItem({
  color,
  isSelected,
  onSelect,
  onCopy,
  onToggleFavorite,
  onDelete,
}: {
  color: Color
  isSelected: boolean
  onSelect: () => void
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
      {...attributes}
      {...listeners}
    >
      <ColorListItem
        color={color}
        isSelected={isSelected}
        onSelect={onSelect}
        onCopy={onCopy}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDelete}
      />
    </div>
  )
}

interface ListViewProps {
  colors: Color[]
}

export function ListView({ colors }: ListViewProps) {
  const { selectedColorId, setSelectedColorId, showArchived } = useUIStore()
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
              onSelect={() => setSelectedColorId(color.id)}
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

- [ ] **Step 2: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/views/ListView.tsx
git commit -m "feat: add drag-and-drop reordering to ListView"
```

---

### Task 7: FolderList をリアルデータ・ドラッグ並び替え対応に更新

**Files:**
- Modify: `src/components/sidebar/FolderList.tsx`

- [ ] **Step 1: src/components/sidebar/FolderList.tsx を全面更新する**

まず現在のファイルを読んでから、以下の完全版に差し替える。

```typescript
import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useFolderStore } from '@/store/folderStore'
import type { Folder } from '@/types/database'

function SortableFolderItem({
  folder,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  folder: Folder
  isActive: boolean
  onSelect: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(folder.name)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: folder.id,
  })

  const handleRenameSubmit = () => {
    if (editValue.trim() && editValue !== folder.name) {
      onRename(editValue.trim())
    }
    setIsEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors"
    >
      {/* ドラッグハンドル */}
      <span
        {...attributes}
        {...listeners}
        className="text-text-muted cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-xs flex-shrink-0"
        title="ドラッグで並び替え"
      >
        ⠿
      </span>

      <span className="text-xs flex-shrink-0">📁</span>

      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit()
            if (e.key === 'Escape') { setEditValue(folder.name); setIsEditing(false) }
          }}
          autoFocus
          className="flex-1 bg-surface-overlay border border-accent rounded px-1 text-sm text-text-primary focus:outline-none"
        />
      ) : (
        <button
          onClick={onSelect}
          onDoubleClick={() => setIsEditing(true)}
          type="button"
          className={[
            'flex-1 text-sm text-left truncate',
            isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          {folder.name}
        </button>
      )}

      {!isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          type="button"
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger text-xs transition-all flex-shrink-0"
          title="フォルダを削除"
        >
          ✕
        </button>
      )}
    </div>
  )
}

interface FolderListProps {
  activeFolderId: string | null
  onSelectFolder: (id: string) => void
}

export function FolderList({ activeFolderId, onSelectFolder }: FolderListProps) {
  const { folders, createFolder, renameFolder, deleteFolder, reorderFolders } = useFolderStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = folders.findIndex((f) => f.id === active.id)
    const newIndex = folders.findIndex((f) => f.id === over.id)
    const reordered = arrayMove(folders, oldIndex, newIndex)
    reorderFolders(reordered.map((f) => f.id))
  }

  const handleCreateSubmit = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim())
    }
    setNewFolderName('')
    setIsCreating(false)
  }

  return (
    <div className="space-y-0.5">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={folders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          {folders.map((folder) => (
            <SortableFolderItem
              key={folder.id}
              folder={folder}
              isActive={activeFolderId === folder.id}
              onSelect={() => onSelectFolder(folder.id)}
              onRename={(name) => renameFolder(folder.id, name)}
              onDelete={() => deleteFolder(folder.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {isCreating ? (
        <div className="px-2.5 py-1.5">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreateSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateSubmit()
              if (e.key === 'Escape') { setNewFolderName(''); setIsCreating(false) }
            }}
            autoFocus
            placeholder="フォルダ名"
            className="w-full bg-surface-overlay border border-accent rounded px-2 py-0.5 text-sm text-text-primary focus:outline-none placeholder:text-text-muted"
          />
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          type="button"
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-secondary transition-colors text-left"
        >
          <span className="text-xs">＋</span>
          <span>フォルダを追加</span>
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/sidebar/FolderList.tsx
git commit -m "feat: add folder CRUD and drag-and-drop to FolderList"
```

---

### Task 8: DetailPanel に編集機能を追加

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`

- [ ] **Step 1: src/components/detail/DetailPanel.tsx を全面更新する**

まず現在のファイルを読んでから、以下の完全版に差し替える。名前・メモ・お気に入り・ロック・アーカイブをSupabaseに保存できるようにする。

```typescript
import { useState } from 'react'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { IconButton } from '@/components/ui/IconButton'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
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

  if (!color) return null

  const FORMATS = ['HEX', 'RGB', 'RGBA', 'HSL', 'HSLA', 'CMYK']

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

        {/* CMYK */}
        {(color.c != null || color.m != null) && (
          <div>
            <p className="text-xs text-text-muted mb-1.5">CMYK（印刷用）</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(['c', 'm', 'y', 'k'] as const).map((ch) => (
                <div key={ch} className="text-center">
                  <p className="text-xs text-text-muted uppercase">{ch}</p>
                  <p className="text-sm font-mono text-text-primary">{color[ch] != null ? Math.round(color[ch]!) : '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/detail/DetailPanel.tsx
git commit -m "feat: add inline editing to DetailPanel"
```

---

### Task 9: AppLayout をリアルデータに接続

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: src/components/layout/AppLayout.tsx を更新する**

まず現在のファイルを読んでから、モックデータをcolorStore・folderStoreに差し替える。

```typescript
import { useEffect, useState } from 'react'
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
  useEffect(() => {
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

      {showAddModal && <AddColorModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: src/components/sidebar/Sidebar.tsx を更新する**

まず現在のファイルを読んでから、`すべての色` の count をcolorStoreから取得するよう修正する（ハードコードの `24` と `3` を削除）。

```typescript
import React, { useState } from 'react'
import { SearchBar } from './SearchBar'
import { NavItem } from './NavItem'
import { FolderList } from './FolderList'
import { TagList } from './TagList'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import type { NavSection } from '@/store/uiStore'

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTagId, setActiveTagId] = useState<string | null>(null)
  const { activeSection, setActiveSection, activeFolderId, setActiveFolderId } = useUIStore()
  const { colors } = useColorStore()

  const allCount = colors.filter((c) => !c.is_archived).length
  const favoriteCount = colors.filter((c) => c.is_favorite && !c.is_archived).length

  const navItems: { id: NavSection; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'all', label: 'すべての色', icon: '◉', count: allCount },
    { id: 'favorites', label: 'お気に入り', icon: '★', count: favoriteCount },
    { id: 'history', label: '最近使った色', icon: '⏱' },
    { id: 'generator', label: 'カラージェネレーター', icon: '✦' },
  ]

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col gap-5 px-3 py-4 bg-surface border-r border-border overflow-y-auto h-full">
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      <nav className="space-y-0.5">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeSection === item.id && !activeFolderId}
            count={item.count}
            onClick={() => setActiveSection(item.id)}
          />
        ))}
      </nav>

      <div>
        <p className="px-2.5 mb-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">フォルダ</p>
        <FolderList activeFolderId={activeFolderId} onSelectFolder={setActiveFolderId} />
      </div>

      <div>
        <p className="px-2.5 mb-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">タグ</p>
        <TagList activeTagId={activeTagId} onSelectTag={setActiveTagId} />
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/components/layout/AppLayout.tsx src/components/sidebar/Sidebar.tsx
git commit -m "feat: connect AppLayout to real Supabase data"
```

---

### Task 10: 動作確認

**Files:** なし（確認のみ）

- [ ] **Step 1: 開発サーバーを起動して動作確認する**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run dev:vite
```

http://localhost:5173 でログイン後、以下を確認：

1. **色の表示** — Supabaseからデータを取得して表示されること（初回は空）
2. **色の追加** — 「＋ 追加」ボタン → `#FF5733` を入力 → 追加 → リストに表示されること
3. **同一HEX重複防止** — 同じHEXを再度追加 → 重複せず先頭に移動すること
4. **お気に入り** — 詳細パネルの★をクリック → リストに反映されること
5. **名前編集** — 詳細パネルの名前をクリック → テキスト入力 → Enterで保存されること
6. **削除** — リストアイテムをホバー → ✕ → 削除されること
7. **ドラッグ並び替え** — リストビューでアイテムをドラッグ → 順序が変わること
8. **フォルダ作成** — サイドバー「フォルダを追加」→ 名前入力 → フォルダが作成されること
9. **フォルダ削除** — フォルダをホバー → ✕ → 削除されること

- [ ] **Step 2: コミット（確認後）**

```bash
git add -A
git commit -m "chore: verify step 3 integration complete"
```

---

## セルフレビュー

**仕様カバレッジ確認：**
- [x] 色CRUD（追加・表示・更新・削除）
- [x] 同一HEX重複防止（updated_at更新＋先頭移動）
- [x] 色の名前：nearest-colorで自動生成（プレースホルダー扱い・直接編集可）
- [x] お気に入り（DetailPanel + ListView）
- [x] ロック機能（DetailPanel編集不可制御）
- [x] アーカイブ（DetailPanel）
- [x] 透明度スライダー（DetailPanel → Supabase保存）
- [x] 一言メモ（DetailPanel → Supabase保存）
- [x] ドラッグ＆ドロップ並び替え（色・フォルダ）
- [x] フォルダCRUD（作成・リネーム・削除・ドラッグ並び替え）
- [x] カラーコード直接入力（HEX / RGB / HSL）
- [x] 保存数上限500色（DBトリガーでエラー → Storeでハンドリング）
- [x] used_countカウント（コピー時 +1）

**未実装（後続ステップ）：**
- GalleryView のドラッグ並び替え（Task 6はListViewのみ）→ Step 4で対応
- フォルダ単位ロック → Step 6で対応
- タグ機能 → Step 7で対応
