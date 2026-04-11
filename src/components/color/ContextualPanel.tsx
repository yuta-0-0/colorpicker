import { useState } from 'react'
import { motion } from 'framer-motion'
import { TagInput } from '@/components/color/TagInput'
import { useColorStore } from '@/store/colorStore'
import type { Color } from '@/types/database'

interface ContextualPanelProps {
  color: Color
  /** Task 8 で差し込む画像エリア（省略時は空スロット表示） */
  imageSlot?: React.ReactNode
}

function MemoArea({ color }: { color: Color }) {
  const { updateColor } = useColorStore()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState('')

  const handleEdit = () => {
    if (color.is_locked) return
    setValue(color.memo ?? '')
    setIsEditing(true)
  }

  const handleSubmit = () => {
    updateColor(color.id, { memo: value.trim() || null })
    setIsEditing(false)
  }

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs text-text-muted mb-1">メモ</p>
      {isEditing ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsEditing(false) }}
          autoFocus
          rows={3}
          className="w-full bg-surface-overlay border border-accent rounded px-2 py-1 text-xs text-text-primary focus:outline-none resize-none"
        />
      ) : (
        <button
          onClick={handleEdit}
          type="button"
          className="w-full text-left text-xs text-text-secondary hover:text-text-primary transition-colors leading-relaxed"
        >
          {color.memo || <span className="text-text-muted">クリックしてメモを追加...</span>}
        </button>
      )}
    </div>
  )
}

/** 画像スロットのプレースホルダー（Task 8 で実装まで） */
function EmptyImageSlots() {
  return (
    <div className="flex gap-2 flex-shrink-0">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-16 h-16 rounded border border-dashed border-border/50 flex items-center justify-center text-text-muted/40 text-lg select-none"
        >
          +
        </div>
      ))}
    </div>
  )
}

export function ContextualPanel({ color, imageSlot }: ContextualPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="overflow-hidden"
    >
      <div className="mx-6 mb-1 border border-border/40 rounded-lg overflow-hidden">
        <div className="flex gap-0 min-h-[88px]">
          {/* 左：画像エリア */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-shrink-0 px-3 py-3 flex items-center"
          >
            {imageSlot ?? <EmptyImageSlots />}
          </motion.div>

          {/* セパレーター */}
          <div className="w-px bg-border/40 flex-shrink-0 my-3" />

          {/* 右：メモ + タグ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1 min-w-0 px-3 py-3 space-y-3"
          >
            <MemoArea color={color} />
            <div>
              <p className="text-xs text-text-muted mb-1">タグ</p>
              <TagInput colorId={color.id} isLocked={color.is_locked} />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
