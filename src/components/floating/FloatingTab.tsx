// src/components/floating/FloatingTab.tsx
//
// ── HeroDot アーキテクチャ対応版 ─────────────────────────────────────
//   内部 LiquidDot は廃止。視覚ドットは FloatingSystemView の HeroDot が担当。
//   この component は「背景ガラスの収束・復元」のみを担当する。
//
// ── clip-path タイムライン ──────────────────────────────────────────
//   A→B exit:  OPEN → P1_DOT  (150ms, EASE_QUINT) → 背景がドットに吸い込まれる
//   B→A enter: P1_DOT → OPEN  (150ms, EASE_QUINT, delay 418ms) → ドット帰還後に復元
//
// ── 寸法メモ ────────────────────────────────────────────────────────
//   FloatingTab: 80 × 32px, 参照距離 ≈ 60.9px
//   P1_DOT: 14px dot → radius 7px → 7/60.9 ≈ 11.5%

import { useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { Easing } from 'motion-utils'
import { useFloatingStore } from '@/store/floatingStore'
import { SpecularBorder, ColorBleed, useSpecularReflection } from './SpecularBorder'
import { usePrefersDark, getGlassTokens } from './useTheme'

// ── clip-path 定数 ──────────────────────────────────────────────────
const DOT_POS = '21% 50%'                      // HeroDot 中心の % 位置
const OPEN    = `circle(150% at ${DOT_POS})`   // 全開
const P1_DOT  = `circle(11.5% at ${DOT_POS})` // 14px dot サイズ（吸い込み先）

// ── タイミング定数 ──────────────────────────────────────────────────
const TOOLBAR_H      = 420
const AB_EXIT_DUR    = 0.28   // A→B: 背景収束 280ms（ゆっくり）
const BA_ENTER_DELAY = 1.184  // B→A: Dot移動完了(1200ms)の16ms前に展開開始
const BA_ENTER_DUR   = 0.18   // B→A: 背景復元 180ms
const TRIM_DELAY     = 1700   // ms: A→B アニメーション完了後のウィンドウトリム
// B→A: FloatingTab マウントから 1700ms 後にウィンドウを 80×32 に戻す
// ※ FloatingToolbar のアンマウント cleanup でタイマーが消えるため FloatingTab 側で担う
const TRIM_DELAY_BA  = 1700

// ── イージング ──────────────────────────────────────────────────────
const EASE_QUINT: Easing = [0.8, 0, 0.6, 1] as Easing  // とろっと：出だし・着地ともに極限まで緩やか


export function FloatingTab() {
  const {
    currentColor, setFloatingState, snapSide,
    setExplosionPending, setDotHovered,
  } = useFloatingStore()
  const specular         = useSpecularReflection({ accentHex: currentColor.hex })
  const trimTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const explosionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDark = usePrefersDark()
  const glass  = getGlassTokens(isDark)

  // ── Cleanup ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (trimTimerRef.current)      clearTimeout(trimTimerRef.current)
      if (delayTimerRef.current)     clearTimeout(delayTimerRef.current)
      if (explosionTimerRef.current) clearTimeout(explosionTimerRef.current)
    }
  }, [])

  // ── B→A トリム + Explosion（FloatingTab マウント時に担当）────────
  // FloatingToolbar のアンマウント cleanup でタイマーが消えるため、
  // マウントされた FloatingTab 側で TRIM_DELAY_BA 後に処理する。
  useEffect(() => {
    explosionTimerRef.current = setTimeout(() => {
      // B→A 後のウィンドウトリム（80×32 に戻す）
      window.electronAPI?.requestFloatingResize({ width: 80, height: 32, anchor: 'center' })
      // Explosion フラグが立っていればメインウィンドウを復元
      if (useFloatingStore.getState().explosionPending) {
        setTimeout(() => {
          window.electronAPI?.requestMainShowFromFloating?.()
          setExplosionPending(false)
        }, 100)
      }
    }, TRIM_DELAY_BA)
    return () => {
      if (explosionTimerRef.current) clearTimeout(explosionTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── ドットダブルクリック: Implosion トリガー（ドック離脱） ─────────
  // e.stopPropagation(): FloatingTab 全体の onDoubleClick（A→B）と衝突させない
  const handleDotDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    window.electronAPI?.triggerImplosionFromDock?.()
  }, [])

  // ── A → B 遷移 ──────────────────────────────────────────────────
  const handleDoubleClick = useCallback(() => {
    window.electronAPI?.requestFloatingResize({ width: 80, height: TOOLBAR_H, anchor: 'center' })
    delayTimerRef.current = setTimeout(() => {
      setFloatingState('toolbar')
      trimTimerRef.current = setTimeout(() => {
        const anchor = snapSide === 'right' ? 'right' : 'left'
        window.electronAPI?.requestFloatingResize({ width: 48, height: TOOLBAR_H, anchor })
      }, TRIM_DELAY)
    }, 60)
  }, [setFloatingState, snapSide])

  return (
    <motion.div
      // B→A enter: P1_DOT（ドット位置）から OPEN（全開）へ展開
      // HeroDot 帰還(434ms) の16ms前(418ms)から開始
      initial={{ clipPath: P1_DOT }}
      animate={{ clipPath: OPEN }}
      // A→B exit: OPEN → P1_DOT へ収束
      exit={{
        clipPath: P1_DOT,
        transition: {
          clipPath: { duration: AB_EXIT_DUR, ease: EASE_QUINT },
        },
      }}
      transition={{
        clipPath: {
          delay:    BA_ENTER_DELAY,
          duration: BA_ENTER_DUR,
          ease:     EASE_QUINT,
        },
      }}
      onDoubleClick={handleDoubleClick}
      onMouseMove={specular.handleMouseMove}
      onMouseLeave={specular.handleMouseLeave}
      style={{
        position: 'relative',
        width: 80,
        height: 32,
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
      {/* ── ガラス背景層 ──────────────────────────────────────────────
          ProxyTab 方式では floatingWin は常に free 状態で表示されるため、
          ガラスは常時 opacity:1。B→A 入場時は BA_ENTER_DELAY 後にフェードイン。 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          opacity: { delay: BA_ENTER_DELAY, duration: 0.008, ease: 'linear' },
        }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 20,
          background: glass.background,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: glass.boxShadow,
          pointerEvents: 'none',
        } as React.CSSProperties}
      />
      {/* 内部カラーにじみ */}
      <ColorBleed borderRadius={20} innerGlow={specular.innerGlow} innerGlowOpacity={specular.innerGlowOpacity} />
      {/* 1.4px 鏡面反射シャモファー */}
      <SpecularBorder
        borderRadius={20}
        background={specular.background}
        opacity={specular.opacity}
      />
      {/* ドット位置確保（no-drag 領域）: 視覚は FloatingSystemView の HeroDot が担当 */}
      {/* onDoubleClick: Implosion（母艦へ戻る）/ hover: HeroDot scale 1.1 */}
      <div
        onDoubleClick={handleDotDoubleClick}
        onMouseEnter={() => setDotHovered(true)}
        onMouseLeave={() => setDotHovered(false)}
        style={{
          WebkitAppRegion: 'no-drag',
          position: 'relative',
          zIndex: 1,
          width: 14,
          height: 14,
          borderRadius: '50%',
          flexShrink: 0,
        } as React.CSSProperties}
      />
    </motion.div>
  )
}
