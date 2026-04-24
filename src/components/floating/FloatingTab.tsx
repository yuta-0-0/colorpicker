import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'
import { SpecularBorder, useSpecularReflection } from './SpecularBorder'

// ── スプリング定数 ─────────────────────────────────────────────
// layoutId による形状モーフ専用（大きな寸法変化に ~350ms の流体感を与える）
const SPRING_MORPH = {
  type: 'spring', stiffness: 100, damping: 18, mass: 0.8,
} as const

export function FloatingTab() {
  const { currentColor, setFloatingState } = useFloatingStore()
  const specular = useSpecularReflection()

  const handleDoubleClick = useCallback(() => {
    // ①ウィンドウを先に 48×320 に拡張 → ②状態変化でモーフ開始
    // （先にリサイズすることで Tab が正しいサイズのウィンドウ内でモーフする）
    window.electronAPI?.requestFloatingResize({ width: 48, height: 320, anchor: 'center' })
    setFloatingState('toolbar')
  }, [setFloatingState])

  return (
    <motion.div
      layoutId="floating-frame"
      layout
      initial={{ opacity: 0, borderColor: 'rgba(255,255,255,0.38)' }}
      animate={{ opacity: 1, borderColor: 'rgba(255,255,255,0.12)' }}
      exit={{ opacity: 0 }}
      transition={{
        // 形状モーフ（width/height/borderRadius）はゆっくりしたスプリングで
        layout:      SPRING_MORPH,
        // opacity は短く — モーフのビジュアルを優先する
        opacity:     { duration: 0.10 },
        borderColor: { duration: 0.9, ease: 'easeOut' },
      }}
      onDoubleClick={handleDoubleClick}
      onMouseMove={specular.handleMouseMove}
      onMouseLeave={specular.handleMouseLeave}
      style={{
        position: 'relative',
        width: 80,
        height: 32,
        borderRadius: 20,
        background: 'rgba(18, 24, 38, 0.70)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
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
      <SpecularBorder
        borderRadius={20}
        background={specular.background}
        opacity={specular.opacity}
      />
      {/* LiquidDot: 左寄せ固定・右側は意図的な余白（Liquid Glass の呼吸） */}
      <div
        style={{
          WebkitAppRegion: 'no-drag',
          position: 'relative',
          zIndex: 1,
        } as React.CSSProperties}
      >
        <LiquidDot hex={currentColor.hex} size={14} />
      </div>
    </motion.div>
  )
}
