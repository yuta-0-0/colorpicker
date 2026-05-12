import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'

type DockMode = 'mini' | 'tab'

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 }

// HEX → RGB 分解
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

// 背景色に対して読みやすい文字色を返す
function getTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)'
}

export function LiquidDock() {
  const [mode, setMode] = useState<DockMode>('tab')
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<HTMLDivElement>(null)
  const lastTapRef = useRef<number>(0)

  const { selectedColorId } = useUIStore()
  const { colors } = useColorStore()
  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? null

  const colorHex = selectedColor?.hex ?? '#0a3ed8'
  const { r, g, b } = hexToRgb(colorHex)
  const textColor = getTextColor(colorHex)

  // ダブルクリック / ダブルタップ検出
  const handleInteraction = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      setMode((m) => m === 'mini' ? 'tab' : 'mini')
    }
    lastTapRef.current = now
  }

  const isMini = mode === 'mini'

  return (
    <motion.div
      ref={dragRef}
      drag
      dragMomentum={false}
      dragElastic={0.08}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      onClick={handleInteraction}
      initial={{ x: typeof window !== 'undefined' ? window.innerWidth - 80 : 900, y: 200 }}
      animate={{
        width: isMini ? 320 : 80,
        height: isMini ? 140 : 24,
        opacity: isDragging ? 0.5 : 1,
        borderRadius: isMini ? 20 : 12,
      }}
      transition={SPRING}
      className="fixed z-50 cursor-grab active:cursor-grabbing select-none overflow-hidden"
      style={{
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        background: `rgba(${r}, ${g}, ${b}, 0.18)`,
        boxShadow: `
          0 0 0 1px rgba(${r}, ${g}, ${b}, 0.25),
          0 8px 32px rgba(${r}, ${g}, ${b}, 0.2),
          0 2px 8px rgba(0,0,0,0.3),
          inset 0 1px 0 rgba(255,255,255,0.15)
        `,
      }}
    >
      {/* Tab モード（細いカプセル） */}
      <AnimatePresence>
        {!isMini && (
          <motion.div
            key="tab-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center"
            style={{ paddingLeft: 8 }}
          >
            {/* Liquid Dot：左側配置 */}
            <motion.div
              animate={{ backgroundColor: colorHex }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="rounded-full flex-shrink-0"
              style={{
                width: 8,
                height: 8,
                boxShadow: `0 0 8px rgba(${r},${g},${b},0.8), 0 0 16px rgba(${r},${g},${b},0.4)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Tile モード */}
      <AnimatePresence>
        {isMini && (
          <motion.div
            key="mini-content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ ...SPRING, delay: 0.05 }}
            className="absolute inset-0 flex items-center gap-4 px-5"
          >
            {/* カラースウォッチ */}
            <motion.div
              animate={{ backgroundColor: colorHex }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="flex-shrink-0 rounded-full"
              style={{
                width: 56,
                height: 56,
                boxShadow: `0 0 20px rgba(${r},${g},${b},0.5), 0 4px 12px rgba(0,0,0,0.3)`,
              }}
            />

            {/* カラー情報 */}
            <div className="flex-1 min-w-0 space-y-1">
              <p
                className="text-sm font-semibold font-mono tracking-wider truncate"
                style={{ color: textColor }}
              >
                {colorHex}
              </p>
              {selectedColor?.name && selectedColor.name !== colorHex && (
                <p
                  className="text-xs truncate"
                  style={{ color: textColor, opacity: 0.7 }}
                >
                  {selectedColor.name}
                </p>
              )}
              <p
                className="text-[10px] tracking-widest uppercase"
                style={{ color: textColor, opacity: 0.5 }}
              >
                {selectedColor ? 'selected' : 'no selection'}
              </p>
            </div>

            {/* Liquid Dot（左下：左側配置） */}
            <motion.div
              animate={{ backgroundColor: colorHex }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="absolute bottom-2.5 left-4 rounded-full"
              style={{
                width: 6,
                height: 6,
                boxShadow: `0 0 6px rgba(${r},${g},${b},0.8)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
