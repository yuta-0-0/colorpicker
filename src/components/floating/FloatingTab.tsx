import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'
import { SpecularBorder, useSpecularReflection } from './SpecularBorder'

// メインウィンドウのパネル・リストと同一スプリング（「吸い付くような」質感）
const SPRING = { type: 'spring', stiffness: 500, damping: 40, mass: 0.5 } as const

export function FloatingTab() {
  const { currentColor, setFloatingState } = useFloatingStore()
  const specular = useSpecularReflection()

  const handleDoubleClick = useCallback(() => {
    setFloatingState('toolbar')
    window.electronAPI?.requestFloatingResize({ width: 48, height: 320, anchor: 'center' })
  }, [setFloatingState])

  return (
    <motion.div
      layoutId="floating-frame"
      layout
      // マウント時: ホワイトボーダーが瞬く（自発光ではなく「ガラスが現れる瞬間に空気を拾う」）
      // その後は SpecularBorder のマウス反射のみで輝く
      initial={{ opacity: 0, borderColor: 'rgba(255,255,255,0.38)' }}
      animate={{ opacity: 1, borderColor: 'rgba(255,255,255,0.12)' }}
      exit={{ opacity: 0 }}
      transition={{
        default:     SPRING,
        borderColor: { duration: 0.9, ease: 'easeOut' },
        opacity:     { duration: 0.18 },
      }}
      onDoubleClick={handleDoubleClick}
      onMouseMove={specular.handleMouseMove}
      onMouseLeave={specular.handleMouseLeave}
      style={{
        position: 'relative',     // SpecularBorder の absolute 基準
        width: 80,
        height: 32,
        borderRadius: 20,
        background: 'rgba(18, 24, 38, 0.70)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        // shorthand border は使わず個別指定（framer-motion borderColor 競合回避）
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
      {/* 鏡面反射（マウス追従） */}
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
