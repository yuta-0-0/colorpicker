import { motion } from 'framer-motion'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'

export function FloatingTab() {
  const { currentColor } = useFloatingStore()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        width: 80,
        height: 32,
        borderRadius: 20,
        background: 'rgba(18, 24, 38, 0.70)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.15)',
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
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <LiquidDot hex={currentColor.hex} size={14} />
      </div>
    </motion.div>
  )
}
