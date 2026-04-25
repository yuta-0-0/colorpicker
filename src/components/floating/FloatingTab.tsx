// src/components/floating/FloatingTab.tsx
//
// ── Iris Morph 多段式（A → B）──────────────────────────────────────
//   キーフレーム配列の「同じ値を隣り合わせ」= 各段で静止（溜め）を作る
//   times が「フェーズ境界」を定義する
//
//   A→B exit フェーズ：
//     1. 高速収束 → LiquidDot サイズで停止
//     2. 一回り大きく → 停止（溜め）
//     3. B アクティブカラーサイズへ膨らむ → そのまま停止（ハンドオフ待機）
//     ★ CLOSE（circle 0%）は使わない = ドットが消える瞬間ゼロ
//
//   B→A enter フェーズ：
//     Toolbar の収束後に「B ドットサイズ」から Tab を展開する（逆再生の起点）
//
// ── 寸法計算メモ ────────────────────────────────────────────────────
//   FloatingTab: 80 × 32 px
//   clip-path circle() の参照値 = √(80²+32²)/√2 ≈ 60.9 px
//
//   LiquidDot (size=14):    radius=7px → 7/60.9 ≈ 11.5%
//   一回り大きい:            radius≈9px → 9/60.9 ≈ 14.8% ≈ 15%
//   B アクティブカラー(24px): radius=12  → 12/60.9 ≈ 19.7% ≈ 20%
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { Easing } from 'motion-utils'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'
import { SpecularBorder, ColorBleed, useSpecularReflection } from './SpecularBorder'
import { usePrefersDark, getGlassTokens } from './useTheme'

// ── clip-path 定数 ──────────────────────────────────────────────────
const DOT_POS   = '21% 50%'                         // Tab 内 LiquidDot の中心（%）

const OPEN      = `circle(150% at ${DOT_POS})`      // 全開
const P1_DOT    = `circle(11.5% at ${DOT_POS})`     // フェーズ1: LiquidDot サイズ
const P2_OVER   = `circle(15%   at ${DOT_POS})`     // フェーズ2: 一回り大きく（溜め前）
const P3_BDOT   = `circle(20%   at ${DOT_POS})`     // フェーズ3: B アクティブカラーサイズ

// ── タイミング定数 ──────────────────────────────────────────────────
const EXIT_DURATION   = 0.92        // A→B exit 全体の秒数
const TOOLBAR_H       = 420         // FloatingToolbar.tsx と同値
const TOOLBAR_DELAY   = 0.68        // Toolbar が開花を始めるタイミング（P3_BDOT 静止中）
const TRIM_DELAY      = 1650        // ms: state 変更後、幅を 48 に縮める猶予

// A→B exit キーフレーム
//   ★ CLOSE（circle 0%）を使わない → ドットが消える瞬間ゼロ
//   同値 2 連続 = 停止（溜め）
const EXIT_FRAMES: string[] = [
  OPEN,      // 0.00 → 全開からスタート
  P1_DOT,    // 0.28 → LiquidDot へ収束
  P1_DOT,    // 0.43 → ★停止（溜め1）
  P2_OVER,   // 0.54 → 一回り大きく膨らむ
  P2_OVER,   // 0.63 → ★停止（溜め2）
  P3_BDOT,   // 0.76 → B カラーサイズへ
  P3_BDOT,   // 1.00 → ★停止したまま Toolbar に引き継ぎ（消えない）
]

const EXIT_TIMES: number[] = [0, 0.28, 0.43, 0.54, 0.63, 0.76, 1.0]
const EXIT_EASES: Easing[] = ['easeIn', 'linear', 'easeInOut', 'linear', 'easeInOut', 'linear']

export function FloatingTab() {
  const { currentColor, setFloatingState, snapSide } = useFloatingStore()
  const specular     = useSpecularReflection({ accentHex: currentColor.hex })
  const trimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDark = usePrefersDark()
  const glass  = getGlassTokens(isDark)

  // ── エントリ閃光 ────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => specular.flash(), TOOLBAR_DELAY * 1000 + 100)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (trimTimerRef.current)  clearTimeout(trimTimerRef.current)
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current)
    }
  }, [])

  // ── A → B 遷移 ──────────────────────────────────────────────────
  const handleDoubleClick = useCallback(() => {
    // 先行リサイズ（描画欠けを防ぐ）
    window.electronAPI?.requestFloatingResize({ width: 80, height: TOOLBAR_H, anchor: 'center' })
    // 60ms 後に状態変化（ウィンドウ再描画を待つ）
    delayTimerRef.current = setTimeout(() => {
      setFloatingState('toolbar')
      // アニメーション完了後に幅をトリム
      trimTimerRef.current = setTimeout(() => {
        const anchor = snapSide === 'right' ? 'right' : 'left'
        window.electronAPI?.requestFloatingResize({ width: 48, height: TOOLBAR_H, anchor })
      }, TRIM_DELAY)
    }, 60)
  }, [setFloatingState, snapSide])

  return (
    <motion.div
      // ── B→A 再マウント時の起点: B アクティブカラーサイズの円から展開 ──
      // AnimatePresence initial={false} により初回マウント時はスキップ
      initial={{ clipPath: P3_BDOT }}
      animate={{ clipPath: OPEN }}
      // ── A→B exit: 多段停止キーフレーム ──
      exit={{
        clipPath: EXIT_FRAMES as unknown as string,
        transition: {
          clipPath: {
            times: EXIT_TIMES,
            duration: EXIT_DURATION,
            ease: EXIT_EASES as Easing[],
          },
        },
      }}
      // ── B→A enter transition: Toolbar の P3 静止中に開花 ──
      transition={{
        clipPath: {
          delay: TOOLBAR_DELAY,
          type: 'spring',
          stiffness: 200,
          damping: 22,
          mass: 0.8,
        },
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
      {/* 内部カラーにじみ（マウス追従） */}
      <ColorBleed borderRadius={20} innerGlow={specular.innerGlow} />
      {/* 1.4px 鏡面反射シャモファー */}
      <SpecularBorder
        borderRadius={20}
        background={specular.background}
        opacity={specular.opacity}
      />
      <div
        style={{
          WebkitAppRegion: 'no-drag',
          position: 'relative',
          zIndex: 1,
        } as React.CSSProperties}
      >
        {/* layoutId="fs-active-dot": A↔B 遷移時に framer-motion がドットを物理的に移動させる */}
        <LiquidDot hex={currentColor.hex} size={14} layoutId="fs-active-dot" />
      </div>
    </motion.div>
  )
}
