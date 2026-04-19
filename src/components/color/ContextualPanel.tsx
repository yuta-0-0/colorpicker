import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TagInput } from '@/components/color/TagInput'
import { MoodImageSlots } from '@/components/color/MoodImageSlots'
import { ContrastChecker } from '@/components/detail/ContrastChecker'
import { ColorPreviewCard } from '@/components/detail/ColorPreviewCard'
import { useColorStore } from '@/store/colorStore'
import { useUIStore } from '@/store/uiStore'
import { usePreviewStore } from '@/store/previewStore'
import type { Color } from '@/types/database'

interface ContextualPanelProps {
  color: Color
}

function MemoArea({ color }: { color: Color }) {
  const { updateColor } = useColorStore()
  const [value, setValue] = useState(color.memo ?? '')

  useEffect(() => {
    setValue(color.memo ?? '')
  }, [color.id])

  const handleSubmit = () => {
    updateColor(color.id, { memo: value.trim() || null })
  }

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs text-text-muted mb-1">メモ</p>
      <div className="bg-surface-raised border border-border/15 rounded-md px-2.5 py-1 hover:border-border/30 focus-within:border-accent/40 transition-colors">
        <textarea
          value={value}
          onChange={(e) => { if (!color.is_locked) setValue(e.target.value) }}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Escape') setValue(color.memo ?? '')
          }}
          disabled={color.is_locked}
          placeholder="一言メモを追加..."
          rows={2}
          className="w-full bg-transparent text-xs text-text-primary resize-none focus:outline-none placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  )
}

export function ContextualPanel({ color }: ContextualPanelProps) {
  const { activeMode } = useUIStore()
  const { syncBgFromSelected } = usePreviewStore()

  const isContrast = activeMode === 'contrast'
  const isPreview  = activeMode === 'preview'

  // Sync BG slot whenever this color changes while in preview mode
  useEffect(() => {
    if (isPreview) {
      syncBgFromSelected(color.hex)
    }
  }, [color.hex, isPreview, syncBgFromSelected])

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.5 }}
      className="overflow-hidden"
    >
      <div className="mx-3 border-t border-border/8" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.04 }}
      >
        {isContrast ? (
          /* ── コントラストモード ── */
          <div className="px-3 py-3">
            <ContrastChecker color={color} />
          </div>
        ) : isPreview ? (
          /* ── Web プレビューモード ── */
          <div className="px-3 py-3">
            <ColorPreviewCard />
          </div>
        ) : (
          /* ── 通常モード：画像 + メモ + タグ ── */
          <div className="flex gap-0 min-h-[88px]">
            <div className="flex-shrink-0 px-3 py-3 flex items-center">
              <MoodImageSlots colorId={color.id} />
            </div>
            <div className="w-px bg-border/8 flex-shrink-0 my-3" />
            <div className="flex-1 min-w-0 px-3 py-3 space-y-3">
              <MemoArea color={color} />
              <div>
                <p className="text-xs text-text-muted mb-1">タグ</p>
                <div className="bg-surface-raised border border-border/15 rounded-md px-2.5 py-0 hover:border-border/30 focus-within:border-accent/40 transition-colors">
                  <TagInput colorId={color.id} isLocked={color.is_locked} />
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
