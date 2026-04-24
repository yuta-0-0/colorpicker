// src/components/floating/FloatingTab.tsx
import { useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'
import { SpecularBorder, useSpecularReflection } from './SpecularBorder'
import { usePrefersDark, getGlassTokens } from './useTheme'

// ── Iris morph 定数 ──────────────────────────────────────────────
// Tab 内 LiquidDot の中心座標（%）
// paddingLeft:10 + size14/2 = 17px / 80px = 21%、高さ中心 = 50%
const DOT_POS    = '21% 50%'
const CLIP_OPEN  = `circle(150% at ${DOT_POS})`
const CLIP_CLOSE = `circle(0% at ${DOT_POS})`

// A→B: iris アニメーション完了後ウィンドウを trim するまでの猶予 (ms)
const TRIM_DELAY = 700
// Toolbar の高さ（FloatingToolbar.tsx と同値を保つこと）
const TOOLBAR_H  = 420

export function FloatingTab() {
  const { currentColor, setFloatingState, snapSide } = useFloatingStore()
  const specular     = useSpecularReflection({ accentHex: currentColor.hex })
  const trimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDark = usePrefersDark()
  const glass  = getGlassTokens(isDark)

  // ── エントリ閃光（iris が開ききる頃に光を当てる） ─────────────
  useEffect(() => {
    const t = setTimeout(() => specular.flash(), 180)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (trimTimerRef.current) clearTimeout(trimTimerRef.current)
    }
  }, [])

  // ── A → B 遷移 ───────────────────────────────────────────────
  // Step 1: 収束 → 溜め → 降下/展開 シークエンス
  // Phase 1 (収束): Tab が iris close で LiquidDot へ縮む
  // Phase 2 (溜め): ウィンドウ拡張後 0.25s の沈黙 → Toolbar の iris open 開始
  // Phase 3/4 (降下/展開): Toolbar の stagger entrance でドットが上から流れ込む
  const handleDoubleClick = useCallback(() => {
    // Step 1: 高さを先行拡張（Tab が iris-close できる空間を確保）
    window.electronAPI?.requestFloatingResize({ width: 80, height: TOOLBAR_H, anchor: 'center' })
    // Step 2: 状態変化（Tab iris-close exit / Toolbar iris-open enter が同時に始まる）
    setFloatingState('toolbar')
    // Step 3: iris + stagger 完了後、Toolbar 幅 48 に trim
    if (trimTimerRef.current) clearTimeout(trimTimerRef.current)
    trimTimerRef.current = setTimeout(() => {
      const anchor = snapSide === 'right' ? 'right' : 'left'
      window.electronAPI?.requestFloatingResize({ width: 48, height: TOOLBAR_H, anchor })
    }, TRIM_DELAY)
  }, [setFloatingState, snapSide])

  return (
    <motion.div
      // ── Phase 1: 収束（LiquidDot へ吸い込まれる iris close）──
      initial={{ clipPath: CLIP_CLOSE }}
      animate={{ clipPath: CLIP_OPEN  }}
      exit={{
        clipPath: CLIP_CLOSE,
        transition: {
          // 速いクローズで「吸い込まれる」感を演出
          clipPath: { type: 'spring', stiffness: 520, damping: 42, mass: 0.35 },
        },
      }}
      transition={{
        // iris open: 少し遅れて LiquidDot の位置から膨らむ
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
        background: glass.background,
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: glass.boxShadow,
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
