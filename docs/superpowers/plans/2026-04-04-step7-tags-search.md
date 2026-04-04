# Step 7 — タグ・特色メモ・検索・絞り込み

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## 目的

タグCRUD・色へのタグ付け・全文検索・タグ絞り込みを実装する。特色メモ（`spot_color`）の編集UIもDetailPanelに追加する。

---

## 現状の把握

### 実装済み
- `src/types/database.ts`: `Tag`, `ColorTag` 型が定義済み（`tags`, `color_tags` テーブルのRow/Insert型）
- `src/components/sidebar/TagList.tsx`: モックデータで表示のみ実装済み
- `src/components/sidebar/SearchBar.tsx`: `value`/`onChange` props を受け取るUIのみ。storeと未接続
- `src/components/detail/DetailPanel.tsx`: `spot_color` は読み取り表示のみ（`color.spot_color && ...`）
- `src/components/layout/AppLayout.tsx`: `displayColors` フィルタリングは `is_favorite` のみ対応

### 未実装
- `tagStore.ts`（Zustand store for tags CRUD + color_tags）
- `uiStore` への `searchQuery`, `activeTagIds` 追加
- `TagList.tsx` のリアルデータ接続 + 複数タグ選択対応
- `DetailPanel.tsx` のタグ編集UI（チップ表示・追加・削除）
- `DetailPanel.tsx` の `spot_color` 編集UI
- `SearchBar.tsx` の `uiStore.searchQuery` 接続
- `AppLayout.tsx` のクライアント側フィルタリング実装
- `FilterBar.tsx` へのタグフィルターボタン追加

---

## ファイル構成

```
src/
  store/
    tagStore.ts          ← 新規作成
    uiStore.ts           ← searchQuery, activeTagIds を追加
  components/
    sidebar/
      TagList.tsx        ← tagStore に接続、複数選択対応
      SearchBar.tsx      ← uiStore.searchQuery に接続（Step 6でforwardRef化済みを前提）
    detail/
      DetailPanel.tsx    ← タグ編集UI追加、spot_color 編集UI追加
    views/
      FilterBar.tsx      ← タグフィルターボタン追加
    layout/
      AppLayout.tsx      ← クライアント側フィルタリング実装
```

---

## Task 1: `src/store/tagStore.ts` 新規作成

**作成ファイル:** `src/store/tagStore.ts`

```typescript
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Tag } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface TagStore {
  tags: Tag[]
  // colorId → tagIds[] のマッピング（クライアントキャッシュ）
  colorTagMap: Record<string, string[]>
  loading: boolean
  error: string | null

  // タグ一覧取得
  fetchTags: () => Promise<void>

  // 特定の色に付いているタグIDを取得してキャッシュ
  fetchColorTags: (colorId: string) => Promise<void>

  // 複数の色のタグを一括取得（AppLayout初期化用）
  fetchColorTagsBatch: (colorIds: string[]) => Promise<void>

  // タグ作成
  createTag: (name: string) => Promise<Tag | null>

  // タグ削除（color_tags も CASCADE で削除される前提。DBにON DELETE CASCADEを設定すること）
  deleteTag: (id: string) => Promise<void>

  // 色にタグを追加
  addTagToColor: (colorId: string, tagId: string) => Promise<void>

  // 色からタグを削除
  removeTagFromColor: (colorId: string, tagId: string) => Promise<void>
}

export const useTagStore = create<TagStore>((set, get) => ({
  tags: [],
  colorTagMap: {},
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

  fetchColorTags: async (colorId) => {
    const { data, error } = await db
      .from('color_tags')
      .select('tag_id')
      .eq('color_id', colorId)

    if (error) return

    const tagIds = (data as { tag_id: string }[]).map((row) => row.tag_id)
    set((state) => ({
      colorTagMap: { ...state.colorTagMap, [colorId]: tagIds },
    }))
  },

  fetchColorTagsBatch: async (colorIds) => {
    if (colorIds.length === 0) return

    const { data, error } = await db
      .from('color_tags')
      .select('color_id, tag_id')
      .in('color_id', colorIds)

    if (error) return

    const newMap: Record<string, string[]> = {}
    for (const row of (data as { color_id: string; tag_id: string }[])) {
      if (!newMap[row.color_id]) newMap[row.color_id] = []
      newMap[row.color_id].push(row.tag_id)
    }

    set((state) => ({
      colorTagMap: { ...state.colorTagMap, ...newMap },
    }))
  },

  createTag: async (name) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 同名タグの重複チェック
    const existing = get().tags.find(
      (t) => t.name.toLowerCase() === name.trim().toLowerCase()
    )
    if (existing) return existing

    const { data, error } = await db
      .from('tags')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    const tag = data as Tag
    set((state) => ({
      tags: [...state.tags, tag].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    return tag
  },

  deleteTag: async (id) => {
    const { error } = await db.from('tags').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    // colorTagMap からも削除
    set((state) => {
      const newMap = { ...state.colorTagMap }
      for (const colorId of Object.keys(newMap)) {
        newMap[colorId] = newMap[colorId].filter((tid) => tid !== id)
      }
      return {
        tags: state.tags.filter((t) => t.id !== id),
        colorTagMap: newMap,
      }
    })
  },

  addTagToColor: async (colorId, tagId) => {
    // 既に付いている場合はスキップ
    const current = get().colorTagMap[colorId] ?? []
    if (current.includes(tagId)) return

    const { error } = await db
      .from('color_tags')
      .insert({ color_id: colorId, tag_id: tagId })

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      colorTagMap: {
        ...state.colorTagMap,
        [colorId]: [...(state.colorTagMap[colorId] ?? []), tagId],
      },
    }))
  },

  removeTagFromColor: async (colorId, tagId) => {
    const { error } = await db
      .from('color_tags')
      .delete()
      .eq('color_id', colorId)
      .eq('tag_id', tagId)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      colorTagMap: {
        ...state.colorTagMap,
        [colorId]: (state.colorTagMap[colorId] ?? []).filter((id) => id !== tagId),
      },
    }))
  },
}))
```

**注意:**
- `color_tags` テーブルの `tag_id` に `ON DELETE CASCADE` が設定されていない場合、`deleteTag` 前に手動で `color_tags` を削除する処理を追加する
- `fetchColorTagsBatch` は AppLayout でのカラー一覧取得後に呼ぶことで、フィルタリングに必要な全データを事前ロードする

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## Task 2: `src/store/uiStore.ts` に searchQuery・activeTagIds を追加

**変更ファイル:** `src/store/uiStore.ts`

現在の `UIStore` interface に以下を追加:

```typescript
export type ViewMode = 'list' | 'gallery'
export type NavSection = 'all' | 'favorites' | 'history' | 'generator'

interface UIStore {
  // ...既存フィールド...

  // 検索
  searchQuery: string
  setSearchQuery: (q: string) => void

  // タグ絞り込み（複数選択）
  activeTagIds: string[]
  toggleTagFilter: (id: string) => void
  clearTagFilters: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  // ...既存の初期値と setter...

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  activeTagIds: [],
  toggleTagFilter: (id) =>
    set((state) => ({
      activeTagIds: state.activeTagIds.includes(id)
        ? state.activeTagIds.filter((tid) => tid !== id)
        : [...state.activeTagIds, id],
    })),
  clearTagFilters: () => set({ activeTagIds: [] }),
}))
```

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## Task 3: `src/components/sidebar/TagList.tsx` をリアルデータに接続

**変更ファイル:** `src/components/sidebar/TagList.tsx`

モックデータを削除し、`tagStore` と `uiStore` に接続。複数タグ選択に対応:

```typescript
import { useTagStore } from '@/store/tagStore'
import { useUIStore } from '@/store/uiStore'

export function TagList() {
  const { tags } = useTagStore()
  const { activeTagIds, toggleTagFilter } = useUIStore()

  if (tags.length === 0) {
    return (
      <p className="px-1 text-xs text-text-muted">タグがありません</p>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggleTagFilter(tag.id)}
          type="button"
          className={[
            'px-2 py-0.5 rounded-full text-xs transition-colors',
            activeTagIds.includes(tag.id)
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

**Sidebar.tsx の呼び出し箇所の変更:**

元の `TagList` は `activeTagId` / `onSelectTag` props を要求していたので、呼び出し側から props を削除する:

```typescript
// Before:
<TagList activeTagId={activeTagId} onSelectTag={onSelectTag} />

// After:
<TagList />
```

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## Task 4: `src/components/sidebar/SearchBar.tsx` を uiStore に接続

**変更ファイル:** `src/components/sidebar/Sidebar.tsx`

`SearchBar` の `value`/`onChange` を `uiStore.searchQuery` / `setSearchQuery` に接続する（Step 6 で `forwardRef` 対応済みの前提）:

```typescript
import { useUIStore } from '@/store/uiStore'

// Sidebar 内:
const { searchQuery, setSearchQuery } = useUIStore()

// JSX:
<SearchBar
  ref={searchInputRef}
  value={searchQuery}
  onChange={setSearchQuery}
/>
```

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## Task 5: `src/components/layout/AppLayout.tsx` でクライアント側フィルタリング実装

**変更ファイル:** `src/components/layout/AppLayout.tsx`

`tagStore` と `uiStore` の `searchQuery`/`activeTagIds` を読み込み、`displayColors` の算出ロジックを拡張する。また `fetchColorTagsBatch` をカラー一覧取得後に呼ぶ:

```typescript
import { useTagStore } from '@/store/tagStore'

// AppLayout 内:
const { searchQuery, activeTagIds } = useUIStore()
const { colorTagMap, fetchTags, fetchColorTagsBatch } = useTagStore()

// 初回データ取得に追加
useEffect(() => {
  fetchFolders()
  fetchTags()
}, [fetchFolders, fetchTags])

// カラー取得後に color_tags を一括取得
useEffect(() => {
  if (colors.length > 0) {
    fetchColorTagsBatch(colors.map((c) => c.id))
  }
}, [colors, fetchColorTagsBatch])

// フィルタリングロジック（favorites → search → tags の順に適用）
const displayColors = (() => {
  let result = activeSection === 'favorites'
    ? colors.filter((c) => c.is_favorite)
    : colors

  // テキスト検索
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase()
    result = result.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.hex.toLowerCase().includes(q) ||
      (c.memo ?? '').toLowerCase().includes(q) ||
      (c.spot_color ?? '').toLowerCase().includes(q)
    )
  }

  // タグ絞り込み（AND条件：選択したタグをすべて持つ色のみ表示）
  if (activeTagIds.length > 0) {
    result = result.filter((c) => {
      const colorTags = colorTagMap[c.id] ?? []
      return activeTagIds.every((tid) => colorTags.includes(tid))
    })
  }

  return result
})()
```

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## Task 6: `src/components/detail/DetailPanel.tsx` にタグ編集UIを追加

**変更ファイル:** `src/components/detail/DetailPanel.tsx`

タグの表示・追加・削除UIを実装する。色にすでに付いているタグはチップで表示し、×ボタンで削除。入力フィールドで既存タグから選択または新規作成:

```typescript
import { useState, useEffect } from 'react'
import { useTagStore } from '@/store/tagStore'

// DetailPanel 内に追加する state:
const [tagInput, setTagInput] = useState('')
const [showTagSuggestions, setShowTagSuggestions] = useState(false)

const { tags, colorTagMap, fetchColorTags, addTagToColor, removeTagFromColor, createTag } = useTagStore()

// 色が変わったらタグを取得
useEffect(() => {
  if (color) fetchColorTags(color.id)
}, [color, fetchColorTags])

const colorTagIds = color ? (colorTagMap[color.id] ?? []) : []
const colorTags = tags.filter((t) => colorTagIds.includes(t.id))
const filteredSuggestions = tagInput.trim()
  ? tags.filter(
      (t) =>
        t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
        !colorTagIds.includes(t.id)
    )
  : tags.filter((t) => !colorTagIds.includes(t.id))

const handleAddTag = async (tagId: string) => {
  if (!color) return
  await addTagToColor(color.id, tagId)
  setTagInput('')
  setShowTagSuggestions(false)
}

const handleCreateAndAddTag = async () => {
  if (!color || !tagInput.trim()) return
  const tag = await createTag(tagInput.trim())
  if (tag) await addTagToColor(color.id, tag.id)
  setTagInput('')
  setShowTagSuggestions(false)
}
```

DetailPanel の JSX に追加するセクション（メモセクションの後）:

```tsx
{/* タグ */}
<div>
  <p className="text-xs text-text-muted mb-1.5">タグ</p>

  {/* 付いているタグ（チップ） */}
  <div className="flex flex-wrap gap-1 mb-2">
    {colorTags.map((tag) => (
      <span
        key={tag.id}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-overlay rounded-full text-xs text-text-secondary"
      >
        {tag.name}
        {!color.is_locked && (
          <button
            type="button"
            onClick={() => removeTagFromColor(color.id, tag.id)}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            ×
          </button>
        )}
      </span>
    ))}
    {colorTags.length === 0 && (
      <span className="text-xs text-text-muted">タグなし</span>
    )}
  </div>

  {/* タグ追加（ロック中は非表示） */}
  {!color.is_locked && (
    <div className="relative">
      <input
        type="text"
        value={tagInput}
        onChange={(e) => {
          setTagInput(e.target.value)
          setShowTagSuggestions(true)
        }}
        onFocus={() => setShowTagSuggestions(true)}
        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleCreateAndAddTag()
          }
        }}
        placeholder="タグを追加..."
        className="w-full bg-surface-overlay border border-border rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
      />

      {showTagSuggestions && (filteredSuggestions.length > 0 || tagInput.trim()) && (
        <div className="absolute z-10 w-full mt-1 bg-surface-raised border border-border rounded-lg shadow-lg overflow-hidden">
          {filteredSuggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={() => handleAddTag(tag.id)}
              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-overlay transition-colors"
            >
              {tag.name}
            </button>
          ))}
          {tagInput.trim() &&
            !tags.find(
              (t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()
            ) && (
              <button
                type="button"
                onMouseDown={handleCreateAndAddTag}
                className="w-full text-left px-3 py-1.5 text-xs text-accent hover:bg-surface-overlay transition-colors border-t border-border/50"
              >
                「{tagInput.trim()}」を新規作成して追加
              </button>
            )}
        </div>
      )}
    </div>
  )}
</div>
```

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## Task 7: `src/components/detail/DetailPanel.tsx` に spot_color 編集UI追加

**変更ファイル:** `src/components/detail/DetailPanel.tsx`

現在は `color.spot_color && (...)` で読み取り専用表示のみ。メモと同様のクリック編集UIに変更する:

```typescript
// state 追加:
const [isEditingSpotColor, setIsEditingSpotColor] = useState(false)
const [spotColorValue, setSpotColorValue] = useState('')

const handleSpotColorSubmit = () => {
  if (!color) return
  updateColor(color.id, { spot_color: spotColorValue.trim() || null })
  setIsEditingSpotColor(false)
}
```

JSX（CMYK セクションの後、メモセクションの前に配置）:

```tsx
{/* 特色メモ */}
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
      placeholder="例: PANTONE 286 C / DIC-43"
      className="w-full bg-surface-overlay border border-accent rounded px-2 py-1 text-sm text-text-primary focus:outline-none"
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
      {color.spot_color || (
        <span className="text-text-muted">
          クリックして特色メモを追加...
        </span>
      )}
    </button>
  )}
</div>
```

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## Task 8: `src/components/views/FilterBar.tsx` にタグフィルターボタン追加

**変更ファイル:** `src/components/views/FilterBar.tsx`

現在の `FilterBar` の末尾に、タグフィルターエリアを追加する。`activeTagIds` を `uiStore` から読み込み、`toggleTagFilter` / `clearTagFilters` で操作:

```typescript
import { useTagStore } from '@/store/tagStore'
import { useUIStore } from '@/store/uiStore'

// FilterBar 内:
const { tags } = useTagStore()
const { activeTagIds, toggleTagFilter, clearTagFilters } = useUIStore()

// JSX に追加（既存フィルターの後）:
{tags.length > 0 && (
  <div className="flex items-center gap-1.5 flex-wrap">
    <span className="text-xs text-text-muted flex-shrink-0">タグ:</span>
    {tags.map((tag) => (
      <button
        key={tag.id}
        type="button"
        onClick={() => toggleTagFilter(tag.id)}
        className={[
          'px-2 py-0.5 rounded-full text-xs transition-colors',
          activeTagIds.includes(tag.id)
            ? 'bg-accent text-white'
            : 'bg-surface-overlay text-text-secondary hover:text-text-primary',
        ].join(' ')}
      >
        {tag.name}
      </button>
    ))}
    {activeTagIds.length > 0 && (
      <button
        type="button"
        onClick={clearTagFilters}
        className="px-2 py-0.5 rounded-full text-xs bg-surface-overlay text-text-muted hover:text-text-primary transition-colors"
      >
        クリア
      </button>
    )}
  </div>
)}
```

**検証コマンド:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

## 実装後の動作確認チェックリスト

- [ ] サイドバーのTagListがSupabaseの `tags` テーブルからデータを表示する
- [ ] TagListでタグをクリックするとハイライトされ、メインエリアの色が絞り込まれる
- [ ] 複数タグを選択するとAND条件で絞り込まれる
- [ ] SearchBarに入力すると色名・HEX・メモ・spot_colorで即時フィルタリングされる
- [ ] `⌘+F` でSearchBarにフォーカスが移り検索できる（Step 6 連動）
- [ ] DetailPanelでタグチップが表示され、×で削除できる
- [ ] DetailPanelのタグ入力フィールドで既存タグが候補表示され、選択で追加できる
- [ ] 存在しないタグ名を入力してEnterまたは「新規作成」をクリックするとタグが作成されて追加される
- [ ] DetailPanelで `spot_color` 欄をクリックして編集・保存できる
- [ ] ロック中の色ではタグ追加・削除・spot_color編集ができない
- [ ] FilterBarにタグフィルターボタンが表示され、サイドバーと連動する
- [ ] 「クリア」ボタンでタグフィルターが全解除される

---

## コミットコマンド

```bash
git add src/store/tagStore.ts \
        src/store/uiStore.ts \
        src/components/sidebar/TagList.tsx \
        src/components/sidebar/Sidebar.tsx \
        src/components/sidebar/SearchBar.tsx \
        src/components/detail/DetailPanel.tsx \
        src/components/views/FilterBar.tsx \
        src/components/layout/AppLayout.tsx
git commit -m "$(cat <<'EOF'
feat: add tag CRUD, spot_color editing, and search/filter

- tagStore: fetchTags, fetchColorTagsBatch, createTag, addTagToColor, removeTagFromColor
- uiStore: searchQuery, activeTagIds, toggleTagFilter, clearTagFilters
- TagList: real data from tagStore, multi-select with AND filtering
- SearchBar: connected to uiStore.searchQuery
- DetailPanel: tag chip UI (add/remove), spot_color inline editing
- FilterBar: tag filter buttons with clear action
- AppLayout: client-side filtering by text search and activeTagIds

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
