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
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="mx-6 mb-1 rounded-lg overflow-hidden"
        style={{
          backdropFilter: 'blur(16px)',
          backgroundColor: 'rgba(8, 9, 15, 0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.2)',
        }}
      >
        <div className="flex gap-0 min-h-[88px]">
          {/* 左：画像エリア */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-shrink-0 px-3 py-3 flex items-center"
          >
            <MoodImageSlots colorId={color.id} />
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
      </motion.div>
    </motion.div>
  )
}
