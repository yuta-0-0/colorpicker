# Step 7: タグ・特色メモ・検索・絞り込み 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** タグCRUD・オートコンプリート入力・特色メモ編集・テキスト検索・タグ/ソート絞り込みを実装する。

**Architecture:** `tagStore` を新規作成してタグとcolor_tagsを管理。`uiStore` に `searchQuery` / `activeTagId` / `sortBy` を追加して検索・絞り込み状態を一元管理。`AppLayout` でフィルターパイプラインを構築。

**Tech Stack:** React 18, Zustand, TypeScript, Supabase, Tailwind CSS

---

## ファイルマップ

| ファイル | 操作 | 内容 |
|---------|------|------|
| `src/store/tagStore.ts` | 新規 | タグCRUD + colorTagsマップ |
| `src/store/uiStore.ts` | 修正 | `searchQuery` / `activeTagId` / `sortBy` 追加 |
| `src/components/color/TagInput.tsx` | 新規 | オートコンプリートタグ入力 |
| `src/components/sidebar/SearchBar.tsx` | 修正 | props廃止・uiStore直接参照 |
| `src/components/sidebar/Sidebar.tsx` | 修正 | ローカルstate削除 |
| `src/components/sidebar/TagList.tsx` | 修正 | tagStore実データ接続 |
| `src/components/detail/DetailPanel.tsx` | 修正 | spot_color編集 + TagInput追加 |
| `src/components/views/FilterBar.tsx` | 修正 | ソート切り替えボタン追加 |
| `src/components/layout/AppLayout.tsx` | 修正 | フィルターパイプライン構築 + fetchTags |

---

## Task 1: tagStore を作成する

**Files:**
- Create: `src/store/tagStore.ts`

- [ ] **Step 1: `src/store/tagStore.ts` を以下の内容で作成する**

```ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Tag } from '@/types/database'

// supabase-js v2 の型推論を回避
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface TagStore {
  tags: Tag[]
  // colorId → Tag[] のマップ（詳細パネルで使用）
  colorTags: Record<string, Tag[]>
  loading: boolean
  error: string | null

  // 全タグ取得（起動時に1回）
  fetchTags: () => Promise<void>

  // 新規タグ作成（同名があれば既存を返す）
  createTag: (name: string) => Promise<Tag | null>

  // タグ削除
  deleteTag: (id: string) => Promise<void>

  // 全ユーザーのcolor_tagsを一括取得（起動時に1回・タグフィルター用）
  fetchAllColorTags: () => Promise<void>

  // 色のタグを取得（DetailPanel が開いたとき）
  fetchColorTags: (colorId: string) => Promise<void>

  // 色にタグを付与
  addTagToColor: (colorId: string, tagId: string) => Promise<void>

  // 色からタグを外す
  removeTagFromColor: (colorId: string, tagId: string) => Promise<void>
}

export const useTagStore = create<TagStore>((set, get) => ({
  tags: [],
  colorTags: {},
  loading: false,
  error: null,

  fetchTags: async () => {
    set({ loading: true, error: null })
    const { data, error } = await db
      .from('tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ tags: (data as Tag[]) ?? [], loading: false })
  },

  createTag: async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return null

    // 同名タグが既に存在する場合は既存を返す
    const existing = get().tags.find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (existing) return existing

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await db
      .from('tags')
      .insert({ user_id: user.id, name: trimmed })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    const newTag = data as Tag
    set((state) => ({ tags: [...state.tags, newTag].sort((a, b) => a.name.localeCompare(b.name)) }))
    return newTag
  },

  deleteTag: async (id) => {
    const { error } = await db
      .from('tags')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => {
      // colorTags からも削除
      const newColorTags = { ...state.colorTags }
      for (const colorId of Object.keys(newColorTags)) {
        newColorTags[colorId] = newColorTags[colorId].filter((t) => t.id !== id)
      }
      return {
        tags: state.tags.filter((t) => t.id !== id),
        colorTags: newColorTags,
      }
    })
  },

  fetchAllColorTags: async () => {
    const { data, error } = await db
      .from('color_tags')
      .select('color_id, tags(id, user_id, name)')

    if (error) {
      set({ error: error.message })
      return
    }

    const map: Record<string, Tag[]> = {}
    for (const row of (data ?? []) as { color_id: string; tags: Tag }[]) {
      if (!map[row.color_id]) map[row.color_id] = []
      if (row.tags) map[row.color_id].push(row.tags)
    }
    set({ colorTags: map })
  },

  fetchColorTags: async (colorId) => {
    const { data, error } = await db
      .from('color_tags')
      .select('tag_id, tags(id, user_id, name)')
      .eq('color_id', colorId)

    if (error) {
      set({ error: error.message })
      return
    }

    // Supabase join result: [{ tag_id, tags: { id, user_id, name } }]
    const fetched: Tag[] = (data ?? [])
      .map((row: { tags: Tag }) => row.tags)
      .filter(Boolean)

    set((state) => ({
      colorTags: { ...state.colorTags, [colorId]: fetched },
    }))
  },

  addTagToColor: async (colorId, tagId) => {
    // 楽観的更新
    const tag = get().tags.find((t) => t.id === tagId)
    if (!tag) return

    const currentTags = get().colorTags[colorId] ?? []
    if (currentTags.some((t) => t.id === tagId)) return // 重複防止

    set((state) => ({
      colorTags: {
        ...state.colorTags,
        [colorId]: [...(state.colorTags[colorId] ?? []), tag],
      },
    }))

    const { error } = await db
      .from('color_tags')
      .insert({ color_id: colorId, tag_id: tagId })

    if (error) {
      // ロールバック
      set((state) => ({
        colorTags: {
          ...state.colorTags,
          [colorId]: (state.colorTags[colorId] ?? []).filter((t) => t.id !== tagId),
        },
        error: error.message,
      }))
    }
  },

  removeTagFromColor: async (colorId, tagId) => {
    // 楽観的更新
    const previousTags = get().colorTags[colorId] ?? []

    set((state) => ({
      colorTags: {
        ...state.colorTags,
        [colorId]: (state.colorTags[colorId] ?? []).filter((t) => t.id !== tagId),
      },
    }))

    const { error } = await db
      .from('color_tags')
      .delete()
      .eq('color_id', colorId)
      .eq('tag_id', tagId)

    if (error) {
      // ロールバック
      set((state) => ({
        colorTags: { ...state.colorTags, [colorId]: previousTags },
        error: error.message,
      }))
    }
  },
}))
```

- [ ] **Step 2: 型チェック**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit 2>&1 | head -30
```

期待: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/store/tagStore.ts
git commit -m "feat: add tagStore with CRUD and color_tags management"
```

---

## Task 2: uiStore に searchQuery / activeTagId / sortBy を追加する

**Files:**
- Modify: `src/store/uiStore.ts`

- [ ] **Step 1: `src/store/uiStore.ts` を読む**

`/Users/yutashimizu/Projects/apps/colorpicker/src/store/uiStore.ts` を読んでください。

- [ ] **Step 2: UIStore インターフェースに追加する**

既存の `isAddingFolder` の定義の直後（`}` の直前）に以下を追加:

```ts
// 検索
searchQuery: string
setSearchQuery: (q: string) => void

// タグ絞り込み
activeTagId: string | null
setActiveTagId: (id: string | null) => void

// ソート
sortBy: 'order' | 'used_count'
setSortBy: (sort: 'order' | 'used_count') => void
```

- [ ] **Step 3: create<UIStore> の初期値に追加する**

既存の `setIsAddingFolder` の直後に追加:

```ts
searchQuery: '',
setSearchQuery: (q) => set({ searchQuery: q }),

activeTagId: null,
setActiveTagId: (id) => set({ activeTagId: id }),

sortBy: 'order',
setSortBy: (sort) => set({ sortBy: sort }),
```

- [ ] **Step 4: 型チェック**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: コミット**

```bash
git add src/store/uiStore.ts
git commit -m "feat: add searchQuery, activeTagId, sortBy to uiStore"
```

---

## Task 3: SearchBar を props なし・uiStore 直接参照に変更する

**Files:**
- Modify: `src/components/sidebar/SearchBar.tsx`

- [ ] **Step 1: `src/components/sidebar/SearchBar.tsx` を以下で置き換える**

```tsx
import { useEffect, useRef } from 'react'
import { useUIStore } from '@/store/uiStore'

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { searchQuery, setSearchQuery, searchFocusTrigger } = useUIStore()

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
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="検索"
        className="w-full pl-9 pr-3 py-1.5 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:outline-dashed focus:outline-2 focus:outline-offset-1 focus:outline-accent/50 transition-colors"
      />
    </div>
  )
}
```

- [ ] **Step 2: 型チェック**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: コミット**

```bash
git add src/components/sidebar/SearchBar.tsx
git commit -m "refactor: SearchBar uses uiStore directly, remove props"
```

---

## Task 4: Sidebar のローカル state を削除する

**Files:**
- Modify: `src/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: `src/components/sidebar/Sidebar.tsx` を読む**

`/Users/yutashimizu/Projects/apps/colorpicker/src/components/sidebar/Sidebar.tsx` を読んでください。

- [ ] **Step 2: Sidebar を以下で置き換える**

```tsx
import React from 'react'
import { SearchBar } from './SearchBar'
import { NavItem } from './NavItem'
import { FolderList } from './FolderList'
import { TagList } from './TagList'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import type { NavSection } from '@/store/uiStore'

export function Sidebar() {
  const { activeSection, setActiveSection, activeFolderId, setActiveFolderId, activeTagId, setActiveTagId } = useUIStore()
  const { colors } = useColorStore()

  const allCount = colors.filter((c) => !c.is_archived).length
  const favoriteCount = colors.filter((c) => c.is_favorite && !c.is_archived).length

  const navItems: { id: NavSection; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'all', label: 'すべての色', icon: '◉', count: allCount },
    { id: 'favorites', label: 'お気に入り', icon: '★', count: favoriteCount },
    { id: 'history', label: '最近使った色', icon: '⏱' },
    { id: 'generator', label: 'カラージェネレーター', icon: '✦' },
  ]

  const handleSelectTag = (id: string) => {
    // 同じタグをクリックでトグル解除
    setActiveTagId(activeTagId === id ? null : id)
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col gap-5 px-3 py-4 bg-surface border-r border-border overflow-y-auto h-full">
      <SearchBar />

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
        <TagList activeTagId={activeTagId} onSelectTag={handleSelectTag} />
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: 型チェック**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: コミット**

```bash
git add src/components/sidebar/Sidebar.tsx
git commit -m "refactor: Sidebar uses uiStore for searchQuery and activeTagId"
```

---

## Task 5: TagList を tagStore 実データで描画する

**Files:**
- Modify: `src/components/sidebar/TagList.tsx`

- [ ] **Step 1: `src/components/sidebar/TagList.tsx` を以下で置き換える**

```tsx
import { useTagStore } from '@/store/tagStore'

interface TagListProps {
  activeTagId: string | null
  onSelectTag: (id: string) => void
}

export function TagList({ activeTagId, onSelectTag }: TagListProps) {
  const { tags } = useTagStore()

  if (tags.length === 0) {
    return (
      <p className="px-2.5 text-xs text-text-muted">タグがありません</p>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelectTag(tag.id)}
          type="button"
          className={[
            'px-2 py-0.5 rounded-full text-xs transition-colors',
            activeTagId === tag.id
              ? 'bg-accent text-white'
              : 'bg-surface-overlay text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 型チェック**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: コミット**

```bash
git add src/components/sidebar/TagList.tsx
git commit -m "feat: TagList uses tagStore real data"
```

---

## Task 6: TagInput コンポーネントを作成する

**Files:**
- Create: `src/components/color/TagInput.tsx`

- [ ] **Step 1: `src/components/color/TagInput.tsx` を以下の内容で作成する**

```tsx
import { useState, useRef, useEffect } from 'react'
import { useTagStore } from '@/store/tagStore'

interface TagInputProps {
  colorId: string
  isLocked: boolean
}

export function TagInput({ colorId, isLocked }: TagInputProps) {
  const { tags, colorTags, fetchColorTags, createTag, addTagToColor, removeTagFromColor } = useTagStore()
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const attachedTags = colorTags[colorId] ?? []

  // DetailPanel が開いたとき（colorId が変わったとき）にタグを取得
  useEffect(() => {
    fetchColorTags(colorId)
  }, [colorId, fetchColorTags])

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setInputValue('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 既に付与済みのタグを除外、inputValue で前方一致フィルター
  const filteredTags = tags.filter(
    (t) =>
      !attachedTags.some((a) => a.id === t.id) &&
      t.name.toLowerCase().includes(inputValue.toLowerCase())
  )

  // 新規作成オプションを表示するか（入力があり、完全一致するタグがない場合）
  const showCreateOption =
    inputValue.trim().length > 0 &&
    !tags.some((t) => t.name.toLowerCase() === inputValue.trim().toLowerCase())

  const handleSelectTag = async (tagId: string) => {
    await addTagToColor(colorId, tagId)
    setInputValue('')
    setIsOpen(false)
  }

  const handleCreateAndAdd = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const newTag = await createTag(trimmed)
    if (newTag) {
      await addTagToColor(colorId, newTag.id)
    }
    setInputValue('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setInputValue('')
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredTags.length > 0) {
        handleSelectTag(filteredTags[0].id)
      } else if (showCreateOption) {
        handleCreateAndAdd()
      }
    }
  }

  return (
    <div>
      {/* 付与済みタグのピル表示 */}
      <div className="flex flex-wrap gap-1 mb-2">
        {attachedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface-overlay text-text-secondary"
          >
            {tag.name}
            {!isLocked && (
              <button
                type="button"
                onClick={() => removeTagFromColor(colorId, tag.id)}
                className="text-text-muted hover:text-text-primary transition-colors leading-none"
                title="タグを外す"
              >
                ✕
              </button>
            )}
          </span>
        ))}
      </div>

      {/* タグ入力（ロック中は非表示） */}
      {!isLocked && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setIsOpen(true) }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="タグを追加..."
            className="w-full px-2 py-1 bg-surface-overlay border border-border rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />

          {/* ドロップダウン */}
          {isOpen && (filteredTags.length > 0 || showCreateOption) && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-surface-raised border border-border rounded-lg shadow-lg z-50 overflow-hidden"
            >
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleSelectTag(tag.id)}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
                >
                  {tag.name}
                </button>
              ))}
              {showCreateOption && (
                <button
                  type="button"
                  onClick={handleCreateAndAdd}
                  className="w-full text-left px-3 py-1.5 text-xs text-accent hover:bg-surface-overlay transition-colors"
                >
                  「{inputValue.trim()}」を作成して追加
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 型チェック**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: コミット**

```bash
git add src/components/color/TagInput.tsx
git commit -m "feat: add TagInput autocomplete component"
```

---

## Task 7: DetailPanel に spot_color 編集と TagInput を追加する

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`

- [ ] **Step 1: `src/components/detail/DetailPanel.tsx` を読む**

`/Users/yutashimizu/Projects/apps/colorpicker/src/components/detail/DetailPanel.tsx` を読んでください。

- [ ] **Step 2: 以下の変更を行う**

**import に追加（ファイル先頭）:**

```tsx
import { TagInput } from '@/components/color/TagInput'
```

**`useState` に追加（`isEditingMemo` の直後）:**

```tsx
const [isEditingSpotColor, setIsEditingSpotColor] = useState(false)
const [spotColorValue, setSpotColorValue] = useState('')
```

**`handleMemoSubmit` の直後に追加:**

```tsx
const handleSpotColorSubmit = () => {
  if (!color) return
  updateColor(color.id, { spot_color: spotColorValue.trim() || null })
  setIsEditingSpotColor(false)
}
```

**詳細パネル本文（`<div className="flex-1 px-4 py-3 space-y-4">`内）に以下を追加・変更:**

特色メモセクション（既存の `{color.spot_color && (...)}` を以下で置き換え）:

```tsx
{/* 特色メモ（クリックで編集） */}
<div>
  <p className="text-xs text-text-muted mb-1">特色メモ</p>
  {isEditingSpotColor ? (
    <input
      type="text"
      value={spotColorValue}
      onChange={(e) => setSpotColorValue(e.target.value)}
      onBlur={handleSpotColorSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSpotColorSubmit()
        if (e.key === 'Escape') setIsEditingSpotColor(false)
      }}
      autoFocus
      placeholder="PANTONE 286 C / DIC-43"
      className="w-full bg-surface-overlay border border-accent rounded px-2 py-1 text-sm text-text-primary focus:outline-none placeholder:text-text-muted"
    />
  ) : (
    <button
      onClick={() => {
        if (!color.is_locked) {
          setSpotColorValue(color.spot_color ?? '')
          setIsEditingSpotColor(true)
        }
      }}
      type="button"
      className="w-full text-left text-sm text-text-secondary hover:text-text-primary transition-colors"
    >
      {color.spot_color || <span className="text-text-muted">クリックして追加...</span>}
    </button>
  )}
</div>
```

一言メモセクションの後（`</div>` の直前）にタグセクションを追加:

```tsx
{/* タグ */}
<div>
  <p className="text-xs text-text-muted mb-1.5">タグ</p>
  <TagInput colorId={color.id} isLocked={color.is_locked} />
</div>
```

- [ ] **Step 3: 型チェック**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: コミット**

```bash
git add src/components/detail/DetailPanel.tsx
git commit -m "feat: add spot_color editing and TagInput to DetailPanel"
```

---

## Task 8: FilterBar にソート切り替えボタンを追加する

**Files:**
- Modify: `src/components/views/FilterBar.tsx`

- [ ] **Step 1: `src/components/views/FilterBar.tsx` を以下で置き換える**

```tsx
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
  const { showArchived, setShowArchived, activeHueFilter, setActiveHueFilter, sortBy, setSortBy } = useUIStore()

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
      <div className="ml-auto flex-shrink-0 flex items-center gap-1">
        <button
          onClick={() => setSortBy('order')}
          type="button"
          className={[
            'px-2 py-1 rounded-full text-xs transition-colors',
            sortBy === 'order'
              ? 'bg-surface-overlay text-text-primary'
              : 'text-text-muted hover:text-text-secondary',
          ].join(' ')}
        >
          並び順
        </button>
        <button
          onClick={() => setSortBy('used_count')}
          type="button"
          className={[
            'px-2 py-1 rounded-full text-xs transition-colors',
            sortBy === 'used_count'
              ? 'bg-surface-overlay text-text-primary'
              : 'text-text-muted hover:text-text-secondary',
          ].join(' ')}
        >
          よく使う順
        </button>
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

- [ ] **Step 2: 型チェック**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: コミット**

```bash
git add src/components/views/FilterBar.tsx
git commit -m "feat: add sort toggle to FilterBar"
```

---

## Task 9: AppLayout にフィルターパイプラインと fetchTags を追加する

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: `src/components/layout/AppLayout.tsx` を読む**

`/Users/yutashimizu/Projects/apps/colorpicker/src/components/layout/AppLayout.tsx` を読んでください。

- [ ] **Step 2: 以下の変更を行う**

**import に追加:**

```tsx
import { useTagStore } from '@/store/tagStore'
```

**`AppLayout` 関数内の既存 store 取得部分を修正（`useUIStore` の取得を拡張）:**

```tsx
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
  searchQuery,
  activeTagId,
  sortBy,
} = useUIStore()
```

**`useFolderStore` の行の直後に追加:**

```tsx
const { fetchTags, fetchAllColorTags, colorTags } = useTagStore()
```

**初回データ取得の `useEffect`（`fetchFolders` を呼ぶもの）を修正:**

```tsx
useEffect(() => {
  fetchFolders()
  fetchTags()
  fetchAllColorTags()
}, [fetchFolders, fetchTags, fetchAllColorTags])
```

**`displayColors` の計算を以下で置き換える:**

```tsx
// 1. favorites フィルター
const baseColors = activeSection === 'favorites'
  ? colors.filter((c) => c.is_favorite)
  : colors

// 2. 色相フィルター
const hueFiltered = activeHueFilter
  ? baseColors.filter((c) => getHueCategory(c.hex) === activeHueFilter)
  : baseColors

// 3. 検索フィルター（name / hex / memo / spot_color / タグ名）
const searchLower = searchQuery.toLowerCase().trim()
const searchFiltered = searchLower
  ? hueFiltered.filter((c) => {
      if (c.name?.toLowerCase().includes(searchLower)) return true
      if (c.hex.toLowerCase().includes(searchLower)) return true
      if (c.memo?.toLowerCase().includes(searchLower)) return true
      if (c.spot_color?.toLowerCase().includes(searchLower)) return true
      const tags = colorTags[c.id] ?? []
      if (tags.some((t) => t.name.toLowerCase().includes(searchLower))) return true
      return false
    })
  : hueFiltered

// 4. タグ絞り込み
const tagFiltered = activeTagId
  ? searchFiltered.filter((c) =>
      (colorTags[c.id] ?? []).some((t) => t.id === activeTagId)
    )
  : searchFiltered

// 5. ソート
const displayColors = sortBy === 'used_count'
  ? [...tagFiltered].sort((a, b) => b.used_count - a.used_count)
  : tagFiltered
```

- [ ] **Step 3: 型チェック**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit 2>&1 | head -30
```

エラーがあれば修正してください。

- [ ] **Step 4: 動作確認**

```bash
npm run dev
```

以下を手動確認:

| 確認項目 | 期待動作 |
|---------|---------|
| サイドバーにタグ一覧が表示される（Supabase にタグがある場合） | 実データで表示 |
| タグがない場合 | 「タグがありません」と表示 |
| 検索バーに入力 | 色名・HEX・メモ・特色メモで絞り込まれる |
| サイドバーのタグをクリック | そのタグを持つ色だけ表示 |
| 同じタグをもう1回クリック | フィルター解除 |
| FilterBar「よく使う順」クリック | used_count 降順にソートされる |
| 詳細パネル → 特色メモをクリック | 編集可能になる |
| 詳細パネル → タグセクション | 既存タグが入力候補に出る / 新規作成できる |

- [ ] **Step 5: コミット**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: connect search/tag/sort filters and fetchTags in AppLayout"
```

---

## 完了チェックリスト

- [ ] タグの作成・付与・削除が動作する
- [ ] 既存タグのオートコンプリートが機能する
- [ ] 同名タグを作成しようとすると既存タグが使われる
- [ ] 特色メモをクリックして編集・保存できる
- [ ] 検索バーで name / HEX / memo / spot_color / タグ名が絞り込まれる
- [ ] サイドバーのタグで絞り込み・トグル解除できる
- [ ] 「よく使う順」ソートが機能する
- [ ] ロック中の色でタグ追加・削除・特色メモ編集が不可になる
- [ ] 型エラーゼロ
