import { useState } from 'react'
import { motion } from 'framer-motion'
import { TagInput } from '@/components/color/TagInput'
import { MoodImageSlots } from '@/components/color/MoodImageSlots'
import { useColorStore } from '@/store/colorStore'
import type { Color } from '@/types/database'

interface ContextualPanelProps {
  color: Color
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

export function ContextualPanel({ color }: ContextualPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.5 }}
      className="overflow-hidden"
    >
      {/* セパレーター：行とパネルの境目を薄く */}
      <div className="mx-3 border-t border-border/30" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.04 }}
        className="flex gap-0 min-h-[88px]"
      >
        {/* 左：画像エリア */}
        <div className="flex-shrink-0 px-3 py-3 flex items-center">
          <MoodImageSlots colorId={color.id} />
        </div>

        {/* セパレーター */}
        <div className="w-px bg-border/30 flex-shrink-0 my-3" />

        {/* 右：メモ + タグ */}
        <div className="flex-1 min-w-0 px-3 py-3 space-y-3">
          <MemoArea color={color} />
          <div>
            <p className="text-xs text-text-muted mb-1">タグ</p>
            <TagInput colorId={color.id} isLocked={color.is_locked} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
