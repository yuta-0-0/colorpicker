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
