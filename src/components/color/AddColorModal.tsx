import { useState, useEffect } from 'react'
import { ColorSwatch } from './ColorSwatch'
import { useColorStore } from '@/store/colorStore'
import { useUIStore } from '@/store/uiStore'
import { useHistoryStore } from '@/store/historyStore'
import { normalizeToHex } from '@/lib/colorUtils'

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
  const { addToHistory } = useHistoryStore()

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
    await addToHistory(previewHex, 1.0)
    await addColor(previewHex, 1.0, activeFolderId)
    setSaving(false)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && previewHex) handleSave()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="glass-popup rounded-2xl p-6 w-80"
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
