# タグ管理機能（編集・削除）実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** サイドバーのタグ一覧からタグ名のインライン編集と削除ができるようにする。

**Architecture:** tagStore に `updateTag` アクションを追加し（Supabase UPDATE）、TagList コンポーネントにホバーで表示される編集・削除ボタンを追加する。編集はインライン input、削除はインライン確認UIで実装する。TagList の現在の「ボタンクリック = フィルター切り替え」動作は維持する。

**Tech Stack:** React, TypeScript, Tailwind CSS v3, Zustand, Supabase

---

## ファイル変更マップ

| ファイル | 変更内容 |
|---|---|
| `src/store/tagStore.ts` | `updateTag(id, name)` アクション追加 |
| `src/components/sidebar/TagList.tsx` | インライン編集・削除UIに全面書き換え |

---

## Task 1: tagStore に updateTag を追加

**Files:**
- Modify: `src/store/tagStore.ts`

---

- [ ] **Step 1: tagStore.ts を読む**

`src/store/tagStore.ts` を読んで現在のインターフェースと実装パターンを把握する（特に `deleteTag` の実装を参考にする）。

- [ ] **Step 2: インターフェースに `updateTag` を追加する**

`TagStore` インターフェースの `deleteTag` の下に追加する：

```ts
// タグ名を更新
updateTag: (id: string, name: string) => Promise<void>
```

- [ ] **Step 3: `updateTag` を実装する**

`create()` 内の `deleteTag` の直後に実装を追加する：

```ts
updateTag: async (id, name) => {
  const trimmed = name.trim()
  if (!trimmed) return
  const { error } = await db
    .from('tags')
    .update({ name: trimmed })
    .eq('id', id)
  if (error) throw error
  set((state) => ({
    tags: state.tags.map((t) => t.id === id ? { ...t, name: trimmed } : t),
  }))
},
```

- [ ] **Step 4: type-check を実行する**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npm run type-check
```

エラーなしで完了することを確認する。

- [ ] **Step 5: コミット**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker
git add src/store/tagStore.ts
git commit -m "feat: add updateTag action to tagStore"
```

---

## Task 2: TagList にインライン編集・削除UIを追加

**Files:**
- Modify: `src/components/sidebar/TagList.tsx`

---

- [ ] **Step 1: TagList.tsx を読む**

`src/components/sidebar/TagList.tsx` を読んで現在の構造を把握する。

現在の構造：
- `tags` を `useTagStore()` から取得
- タグを `<button>` のリストとして表示（クリックでフィルター切り替え）
- ホバーUIなし・編集・削除なし

- [ ] **Step 2: TagList.tsx を新しい実装に書き換える**

ファイル全体を以下に置き換える：

```tsx
import React, { useRef, useState } from 'react'
import { useTagStore } from '@/store/tagStore'
import type { Tag } from '@/types/database'

interface TagListProps {
  activeTagId: string | null
  onSelectTag: (id: string) => void
}

export function TagList({ activeTagId, onSelectTag }: TagListProps) {
  const { tags, updateTag, deleteTag } = useTagStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id)
    setEditValue(tag.name)
    setConfirmingDeleteId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleSaveEdit = async (e?: React.FormEvent | React.FocusEvent) => {
    e?.preventDefault()
    if (!editingId || !editValue.trim()) {
      cancelEdit()
      return
    }
    await updateTag(editingId, editValue)
    cancelEdit()
  }

  const handleDeleteConfirm = async (id: string) => {
    await deleteTag(id)
    setConfirmingDeleteId(null)
  }

  if (tags.length === 0) {
    return (
      <p className="px-2.5 text-xs text-text-muted">タグがありません</p>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 px-1">
      {tags.map((tag) => (
        <div key={tag.id} className="group relative flex items-center gap-0.5">

          {/* 編集モード */}
          {editingId === tag.id ? (
            <form onSubmit={handleSaveEdit} className="flex-1 min-w-0">
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                onBlur={handleSaveEdit}
                className="w-full px-2 py-0.5 text-xs bg-surface-overlay border border-accent rounded text-text-primary outline-none"
                autoFocus
              />
            </form>
          ) : (
            /* 通常表示: クリックでフィルター */
            <button
              type="button"
              onClick={() => onSelectTag(tag.id)}
              className={[
                'flex-1 min-w-0 text-left px-2 py-0.5 rounded-full text-xs transition-colors truncate',
                activeTagId === tag.id
                  ? 'bg-accent text-white'
                  : 'bg-surface-overlay text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              {tag.name}
            </button>
          )}

          {/* ホバーで表示する編集・削除ボタン（編集モード中は非表示）*/}
          {editingId !== tag.id && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
              {/* 編集ボタン */}
              <button
                type="button"
                onClick={() => startEdit(tag)}
                className="p-0.5 text-text-muted hover:text-text-primary rounded transition-colors"
                title="タグ名を編集"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              {/* 削除ボタン */}
              <button
                type="button"
                onClick={() => setConfirmingDeleteId(tag.id)}
                className="p-0.5 text-text-muted hover:text-danger rounded transition-colors"
                title="タグを削除"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          {/* 削除確認（インライン）*/}
          {confirmingDeleteId === tag.id && (
            <div className="absolute inset-0 flex items-center justify-between px-2 bg-surface-raised border border-danger/30 rounded text-xs z-10">
              <span className="text-text-secondary truncate">削除?</span>
              <div className="flex gap-1 flex-shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => handleDeleteConfirm(tag.id)}
                  className="px-1.5 py-0.5 bg-danger text-white rounded text-xs"
                >
                  確認
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteId(null)}
                  className="px-1.5 py-0.5 bg-surface-overlay text-text-secondary rounded text-xs hover:text-text-primary"
                >
                  取消
                </button>
              </div>
            </div>
          )}

        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: type-check を実行する**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npm run type-check
```

エラーがあれば修正する。

- [ ] **Step 4: コミット**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker
git add src/components/sidebar/TagList.tsx
git commit -m "feat: add inline tag edit and delete UI to sidebar TagList"
```

---

## 完了後の確認コマンド

```bash
npm run type-check
```

---

## 注意事項

- **`Tag` 型** は `src/types/database.ts` から `Database['public']['Tables']['tags']['Row']` として定義されており `{ id: string, user_id: string, name: string }` の3フィールド。
- **削除のカスケード**：Supabase の `color_tags` テーブルに `ON DELETE CASCADE` が設定されていれば、タグ削除時に関連する `color_tags` レコードも自動削除される。設定なしの場合は Supabase 側でエラーになるが、アプリ側での追加対応は今回のスコープ外。
- **`flex-wrap` → `flex-col`**：現在の TagList は `flex-wrap` でタグをバッジ状に並べているが、編集・削除UIを付けるため `flex-col` の縦リストに変更する。
