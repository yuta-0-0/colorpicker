// src/components/floating/FloatingTab.tsx
import { useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'
import { SpecularBorder, useSpecularReflection } from './SpecularBorder'

// ── Iris morph 定数 ──────────────────────────────────────────────
// Tab 内 LiquidDot の中心座標（%）
// paddingLeft:10 + size14/2 = 17px / 80px = 21%、高さ中心 = 50%
const DOT_POS    = '21% 50%'
const CLIP_OPEN  = `circle(150% at ${DOT_POS})`
const CLIP_CLOSE = `circle(0% at ${DOT_POS})`

// A→B: iris アニメーション完了後ウィンドウを trim するまでの猶予 (ms)
const TRIM_DELAY = 680
// Toolbar の高さ（FloatingToolbar.tsx と同値を保つこと）
const TOOLBAR_H  = 380

export function FloatingTab() {
  const { currentColor, setFloatingState, snapSide } = useFloatingStore()
  const specular     = useSpecularReflection()
  const trimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── エントリ閃光（iris が開ききる頃に光を当てる） ─────────────
  useEffect(() => {
    const t = setTimeout(() => specular.flash(), 160)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (trimTimerRef.current) clearTimeout(trimTimerRef.current)
    }
  }, [])

  // ── A → B 遷移 ───────────────────────────────────────────────
  const handleDoubleClick = useCallback(() => {
    // Step 1: 高さを先行拡張（幅 80 保持 → Tab が iris-close できる空間を確保）
    window.electronAPI?.requestFloatingResize({ width: 80, height: TOOLBAR_H, anchor: 'center' })
    // Step 2: 状態変化（Tab iris-close exit / Toolbar iris-open enter が同時に始まる）
    setFloatingState('toolbar')
    // Step 3: iris アニメーション完了後、Toolbar 幅 48 に trim
    if (trimTimerRef.current) clearTimeout(trimTimerRef.current)
    trimTimerRef.current = setTimeout(() => {
      const anchor = snapSide === 'right' ? 'right' : 'left'
      window.electronAPI?.requestFloatingResize({ width: 48, height: TOOLBAR_H, anchor })
    }, TRIM_DELAY)
  }, [setFloatingState, snapSide])

  return (
    <motion.div
      // ── Iris Morph ──
      initial={{ clipPath: CLIP_CLOSE }}
      animate={{ clipPath: CLIP_OPEN  }}
      exit={{
        clipPath: CLIP_CLOSE,
        transition: {
          // 高速クローズ（Toolbar の入場を引き立てる）
          clipPath: { type: 'spring', stiffness: 480, damping: 40, mass: 0.4 },
        },
      }}
      transition={{
        // iris open: 僅かに遅らせて先行するクローズを際立たせる
        clipPath: { delay: 0.06, type: 'spring', stiffness: 200, damping: 22, mass: 0.8 },
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
        // border: none — SpecularBorder が 1.4px chamfer を担う
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.14), inset 0 0 12px rgba(255,255,255,0.04)',
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
      {/* LiquidDot: 左寄せ固定（Iris の収束点） */}
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
