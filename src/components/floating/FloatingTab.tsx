import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'
import { BorderTrace, useBorderTrace } from './BorderTrace'

export function FloatingTab() {
  const { currentColor, setFloatingState } = useFloatingStore()
  const trace = useBorderTrace(true) // mount 時に自動発火

  const handleDoubleClick = useCallback(() => {
    setFloatingState('toolbar')
    window.electronAPI?.requestFloatingResize({ width: 48, height: 320, anchor: 'center' })
  }, [setFloatingState])

  return (
    <motion.div
      layoutId="floating-frame"
      layout
      // borderColor は shorthand を使わず framer-motion に完全委譲（グロー有効化）
      initial={{ opacity: 0.6, borderColor: 'rgba(80,176,211,1)' }}
      animate={{ opacity: 1,   borderColor: 'rgba(255,255,255,0.15)' }}
      exit={{ opacity: 0 }}
      transition={{
        default:     { type: 'spring', stiffness: 200, damping: 22 },
        borderColor: { duration: 1.2, ease: 'easeOut' },
        opacity:     { duration: 0.15 },
      }}
      onDoubleClick={handleDoubleClick}
      // hover で再発火
      onHoverStart={trace.run}
      style={{
        position: 'relative', // BorderTrace の absolute 基準
        width: 80,
        height: 32,
        borderRadius: 20,
        background: 'rgba(18, 24, 38, 0.70)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        // shorthand border を使わず個別指定（framer-motion borderColor 競合回避）
        borderWidth: '0.5px',
        borderStyle: 'solid',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 10,
        gap: 8,
        userSelect: 'none',
        WebkitAppRegion: 'drag',
        cursor: 'grab',
        overflow: 'hidden',
      } as React.CSSProperties}
    >
      {/* 境界線を走る光 */}
      <BorderTrace borderRadius={20} background={trace.background} opacity={trace.opacity} />

      <div style={{ WebkitAppRegion: 'no-drag', position: 'relative', zIndex: 1 } as React.CSSProperties}>
        <LiquidDot hex={currentColor.hex} size={14} />
      </div>
    </motion.div>
  )
}
