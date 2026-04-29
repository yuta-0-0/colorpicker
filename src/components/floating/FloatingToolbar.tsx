// src/components/floating/FloatingToolbar.tsx
//
// ── HeroDot アーキテクチャ対応版 ─────────────────────────────────────
//   内部 LiquidDot（24px）は廃止。視覚ドットは FloatingSystemView の HeroDot が担当。
//   この component は「背景ガラスの開花・収縮」のみを担当する。
//
// ── A→B enter clip-path タイムライン（300ms）──────────────────────────
//   Phase 1 (0→80ms):  TB_DOT_ORIGIN → TB_EXPANDED（横幅確定、Y固定）
//   Phase 2 (80→300ms): TB_EXPANDED → TB_OPEN（純粋垂直降下+全開）
//   ✕ Phase2 衝撃（AB_ENTER_DELAY+80ms ≈ 448ms）で各要素が 20ms 刻みで溢出
//
// ── B→A exit clip-path タイムライン（200ms）────────────────────────────
//   TB_OPEN → TB_DOT_ORIGIN（Toolbar全体がドット位置へ一気に吸い込まれる）

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { Easing } from 'motion-utils'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'
import { HandyDock } from './HandyDock'
import { SpecularBorder, ColorBleed, useSpecularReflection } from './SpecularBorder'
import { usePrefersDark, getGlassTokens, type GlassTokens } from './useTheme'
import {
  IconEyedropper,
  IconCopy,
  IconCheck,
  IconFolder,
  IconMinus,
  IconPlus,
  IconSun,
  IconMoon,
} from '@/components/ui/Icons'

// ── 定数 ────────────────────────────────────────────────────────────
const TOOLBAR_H = 420

// clip-path 定数（Toolbar 空間: 48 × 420px）
// HeroDot 中心 = left:12 + 24/2 = 24px → 50%, top:46 + 24/2 = 58px → 13.8%≈14%
// 参照距離 = √(48²+420²)/√2 ≈ 298.9px
const TB_DOT_POS   = '50% 14%'
const TB_OPEN      = `circle(150% at ${TB_DOT_POS})`
// A→B enter 起点 / B→A exit 着点: HeroDot 到着位置（半径 4%×298.9≈12px = dot radius）
const TB_DOT_ORIGIN = 'circle(4% at 50% 14%)'

// ── タイミング ──────────────────────────────────────────────────────
const AB_ENTER_DELAY   = 0.914  // A→B: Dot移動完了(930ms)の16ms前に展開開始
const AB_ENTER_DUR     = 0.36   // A→B: 360ms で開花
const BA_EXIT_DUR        = 0.55   // B→A: 吸い込み 550ms（ゆったり）
const BA_BUTTON_EXIT_DUR = 0.22   // B→A: ボタン吸い込み duration
const BA_BG_EXIT_DELAY   = 0.00   // B→A: ボタンと同時に背景収束開始
const TRIM_DELAY_BA      = 1700   // ms: B→A 全体完了後にウィンドウトリム
const DOCK_CLOSE_DELAY = 220

// ── イージング ──────────────────────────────────────────────────────
const EASE_QUINT: Easing = [0.8, 0, 0.6, 1] as Easing  // とろっと：出だし・着地ともに極限まで緩やか
const ENTER_DUR        = 0.30                             // 各要素の入場 duration

const SPRING_TAP = { type: 'spring', stiffness: 300, damping: 30 } as const

// ── ユーティリティ ───────────────────────────────────────────────────
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  })
}

// ── 円形タクティルボタン ────────────────────────────────────────────
function TactileButton({
  onClick, onPointerDown, onPointerUp, onPointerLeave,
  title, children, glass, active, entranceDelay,
}: {
  onClick?: () => void
  onPointerDown?: () => void
  onPointerUp?: () => void
  onPointerLeave?: () => void
  title?: string
  children: React.ReactNode
  glass: GlassTokens
  active?: boolean
  entranceDelay?: number
}) {
  const hasEntrance = entranceDelay !== undefined
  return (
    <motion.button
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      title={title}
      initial={hasEntrance ? { y: 20, opacity: 0 } : undefined}
      animate={hasEntrance ? { y: 0, opacity: 1 } : undefined}
      exit={{ y: -20, scale: 0.7, opacity: 0, transition: {
        y:       { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
        scale:   { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
        opacity: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
      }}}
      whileTap={{ scale: 0.90 }}
      transition={hasEntrance ? {
        y:       { delay: entranceDelay, duration: ENTER_DUR, ease: EASE_QUINT },
        opacity: { delay: entranceDelay, duration: ENTER_DUR, ease: EASE_QUINT },
        scale:   { type: 'spring', stiffness: 300, damping: 30 },
      } : SPRING_TAP}
      style={{
        background: active ? glass.accentBg : glass.buttonBg,
        border: `0.5px solid ${active ? glass.accentBorder : glass.buttonBorder}`,
        borderRadius: '50%',
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: active ? glass.accentColor : glass.textMuted,
        padding: 0,
        WebkitAppRegion: 'no-drag',
        flexShrink: 0, position: 'relative', zIndex: 1,
      } as React.CSSProperties}
    >
      {children}
    </motion.button>
  )
}

// ── FloatingToolbar ─────────────────────────────────────────────────
export function FloatingToolbar() {
  const {
    currentColor, previousColor, snapSide,
    miniSlots, setMiniSlot, pushMiniSlot, promoteSlot,
    setFloatingState, setPendingSaveAfterPick, setExplosionPending,
  } = useFloatingStore()

  const [copied, setCopied]               = useState(false)
  const [dockOpen, setDockOpen]           = useState(false)
  const [eyeLongActive, setEyeLongActive] = useState(false)
  // ejecting: プロモート前に吸い上げアニメーションを再生するスロットのインデックス
  const [ejectingIndex, setEjectingIndex] = useState<number | null>(null)

  const copyTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slotTimers    = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const trimTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eyeTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDark   = usePrefersDark()
  const glass    = getGlassTokens(isDark)
  const specular = useSpecularReflection({ accentHex: currentColor.hex })

  // ── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (copyTimerRef.current)  clearTimeout(copyTimerRef.current)
      if (trimTimerRef.current)  clearTimeout(trimTimerRef.current)
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current)
      if (eyeTimerRef.current)   clearTimeout(eyeTimerRef.current)
      slotTimers.current.forEach(t => clearTimeout(t))
    }
  }, [])

  // ── テーマ切替 ───────────────────────────────────────────────
  const handleToggleTheme = useCallback(() => {
    window.electronAPI?.setTheme(isDark ? 'light' : 'dark')
  }, [isDark])

  // ── コピー（flash）──────────────────────────────────────────
  const handleCopyHex = useCallback(() => {
    copyToClipboard(currentColor.hex)
    setCopied(true)
    specular.flash()
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
  }, [currentColor.hex, specular])

  // ── ドットダブルクリック（Floating → Main Explosion）────────
  // explosionPending フラグを立てて B→A を開始する。
  // Explosion の発火は FloatingTab（マウント時）が担う。
  // ※ FloatingToolbar はアンマウント時に cleanup で timers を消すため、
  //   ここでは Explosion 用タイマーを持たない。
  const handleDotDoubleClick = useCallback(() => {
    setExplosionPending(true)
    setDockOpen(false)
    const anchor = snapSide === 'right' ? 'right' : 'left'
    window.electronAPI?.requestFloatingResize({ width: 80, height: TOOLBAR_H, anchor })
    delayTimerRef.current = setTimeout(() => {
      setFloatingState('tab')
    }, 60)
  }, [setFloatingState, snapSide, setExplosionPending])

  // ── スポイト（長押し 450ms = 保存フラグ ON）─────────────────
  const handleEyePointerDown = useCallback(() => {
    eyeTimerRef.current = setTimeout(() => {
      setEyeLongActive(true)
      setPendingSaveAfterPick(true)
    }, 450)
  }, [setPendingSaveAfterPick])

  const handleEyePointerUp = useCallback(() => {
    if (eyeTimerRef.current) { clearTimeout(eyeTimerRef.current); eyeTimerRef.current = null }
    setEyeLongActive(false)
    window.electronAPI?.startScreenPicker()
  }, [])

  const handleEyePointerLeave = useCallback(() => {
    if (eyeTimerRef.current) { clearTimeout(eyeTimerRef.current); eyeTimerRef.current = null }
    setEyeLongActive(false)
    setPendingSaveAfterPick(false)
  }, [setPendingSaveAfterPick])

  // ── スロット操作 ────────────────────────────────────────────
  const handleRegisterSlot = useCallback((i: number) => setMiniSlot(i, currentColor.hex), [currentColor.hex, setMiniSlot])

  const handleSlotPointerDown = useCallback((i: number) => {
    slotTimers.current.set(i, setTimeout(() => {
      slotTimers.current.delete(i)
      setMiniSlot(i, currentColor.hex)
    }, 450))
  }, [currentColor.hex, setMiniSlot])

  const handleSlotPointerUp = useCallback((i: number, hex: string | null) => {
    const t = slotTimers.current.get(i); if (!t) return
    clearTimeout(t); slotTimers.current.delete(i)
    if (hex) {
      // 吸い上げアニメーション開始 → onAnimationComplete 後に promoteSlot
      setEjectingIndex(i)
    } else {
      window.electronAPI?.floatingSaveColor?.({
        hex: currentColor.hex,
        alpha: currentColor.alpha,
        name: currentColor.name ?? currentColor.hex,
      })
      window.electronAPI?.floatingColorSelected(currentColor.hex)
      specular.flash()
      handleRegisterSlot(i)
    }
  }, [currentColor, specular, handleRegisterSlot])

  const handleSlotPointerLeave = useCallback((i: number) => {
    const t = slotTimers.current.get(i)
    if (t) { clearTimeout(t); slotTimers.current.delete(i) }
  }, [])

  // ── ＋ボタン ────────────────────────────────────────────────
  const handlePushSlot = useCallback(() => {
    pushMiniSlot(currentColor.hex)
    specular.flash()
  }, [currentColor.hex, pushMiniSlot, specular])

  // ── 縮小（B → A）──────────────────────────────────────────────
  const handleShrink = useCallback(() => {
    setDockOpen(false)
    const anchor = snapSide === 'right' ? 'right' : 'left'
    window.electronAPI?.requestFloatingResize({ width: 80, height: TOOLBAR_H, anchor })
    delayTimerRef.current = setTimeout(() => {
      setFloatingState('tab')
      trimTimerRef.current = setTimeout(() => {
        window.electronAPI?.requestFloatingResize({ width: 80, height: 32, anchor: 'center' })
      }, TRIM_DELAY_BA)
    }, 60)
  }, [setFloatingState, snapSide])

  // ── Dock 開閉リサイズ ──────────────────────────────────────────
  useEffect(() => {
    const anchor = snapSide === 'right' ? 'right' : 'left'
    if (dockOpen) {
      window.electronAPI?.requestFloatingResize({ width: 352, height: TOOLBAR_H, anchor })
      return
    }
    const timer = setTimeout(() => {
      window.electronAPI?.requestFloatingResize({ width: 48, height: TOOLBAR_H, anchor })
    }, DOCK_CLOSE_DELAY)
    return () => clearTimeout(timer)
  }, [dockOpen, snapSide])

  const isDockLeft = snapSide !== 'right'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isDockLeft ? 'row' : 'row-reverse',
        alignItems: 'flex-start',
        height: TOOLBAR_H,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {/* ── Toolbar 本体 ── */}
      <motion.div
        // ── A→B enter: HeroDot 到着(AB_ENTER_DELAY)後にドット位置から一気に開花
        // opacity は AB_ENTER_DELAY まで 0 に保ち、ゴーストドットを完全に防ぐ
        initial={{ clipPath: TB_DOT_ORIGIN, opacity: 0 }}
        animate={{ clipPath: TB_OPEN, opacity: 1 }}
        // ── B→A exit: ドット位置へ滑らかに収束（240ms）────────────────────
        exit={{
          clipPath: TB_DOT_ORIGIN,
          transition: {
            // ボタン退場(BA_BUTTON_EXIT_DUR)後に背景収束開始
            clipPath: { delay: BA_BG_EXIT_DELAY, duration: BA_EXIT_DUR, ease: EASE_QUINT },
          },
        }}
        transition={{
          opacity: {
            delay:    AB_ENTER_DELAY,  // HeroDot 到着まで不可視（ゴーストドット防止）
            duration: 0.008,
            ease:     'linear',
          },
          clipPath: {
            delay:    AB_ENTER_DELAY,
            duration: AB_ENTER_DUR,
            ease:     EASE_QUINT,
          },
        }}
        onMouseMove={specular.handleMouseMove}
        onMouseLeave={specular.handleMouseLeave}
        style={{
          position: 'relative',
          width: 48,
          height: TOOLBAR_H,
          borderRadius: 24,
          background: glass.background,
          backdropFilter: 'blur(24px) saturate(185%)',
          WebkitBackdropFilter: 'blur(24px) saturate(185%)',
          boxShadow: glass.boxShadow,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: 8,
          WebkitAppRegion: 'drag',
          flexShrink: 0,
          overflow: 'hidden',
        } as React.CSSProperties}
      >
        {/* 内部カラーにじみ */}
        <ColorBleed borderRadius={24} innerGlow={specular.innerGlow} innerGlowOpacity={specular.innerGlowOpacity} />
        {/* 1.4px 鏡面反射シャモファー */}
        <SpecularBorder
          borderRadius={24}
          background={specular.background}
          opacity={specular.opacity}
        />

        {/* ── 地層 1: 縮小ボタン（Phase1 衝撃で溢出: +0.00）── */}
        <motion.button
          onClick={handleShrink}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, scale: 0.7, opacity: 0, transition: {
            y:       { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
            scale:   { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
            opacity: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
          }}}
          whileTap={{ scale: 0.90 }}
          transition={{
            y:       { delay: AB_ENTER_DELAY + 0.00, duration: 0.36, ease: EASE_QUINT },
            opacity: { delay: AB_ENTER_DELAY + 0.00, duration: 0.36, ease: EASE_QUINT },
            scale:   { type: 'spring', stiffness: 300, damping: 30 },
          }}
          title="カプセルに戻す"
          style={{
            background: glass.buttonBg,
            border: `0.5px solid ${glass.buttonBorder}`,
            borderRadius: '50%',
            width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: glass.textExtra, padding: 0,
            WebkitAppRegion: 'no-drag',
            position: 'relative', zIndex: 1, flexShrink: 0,
          } as React.CSSProperties}
        >
          <IconMinus size={12} />
        </motion.button>

        {/* ── 地層 2: LiquidDot（clip-path 降下で視覚的に②段目へ引き寄せる）── */}
        <div
          onDoubleClick={handleDotDoubleClick}
          title="現在色（ダブルクリックで履歴に保存）"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3,
            flexShrink: 0, position: 'relative', zIndex: 1,
            cursor: 'pointer', WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          {/* HeroDot が視覚を担当: 24×24 の透明スペーサーのみ */}
          <div style={{ width: 24, height: 24, flexShrink: 0 }} />
          {previousColor && (
            <LiquidDot hex={previousColor.hex} size={14} style={{ opacity: 0.55 }} />
          )}
        </div>

        {/* ── Divider 1（+0.02）── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0, transition: { opacity: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT } } }}
          transition={{
            y:       { delay: AB_ENTER_DELAY + 0.02, duration: ENTER_DUR, ease: EASE_QUINT },
            opacity: { delay: AB_ENTER_DELAY + 0.02, duration: ENTER_DUR, ease: EASE_QUINT },
          }}
          style={{ width: 28, height: 0.5, background: glass.divider, position: 'relative', zIndex: 1, flexShrink: 0 }}
        />

        {/* ── スポイト ── */}
        <TactileButton
          onPointerDown={handleEyePointerDown}
          onPointerUp={handleEyePointerUp}
          onPointerLeave={handleEyePointerLeave}
          title="スポイト（長押し：取得後に自動保存）"
          glass={glass} active={eyeLongActive}
          entranceDelay={AB_ENTER_DELAY + 0.04}
        >
          <IconEyedropper size={13} />
        </TactileButton>

        {/* ── コピー ── */}
        <TactileButton
          onClick={handleCopyHex}
          title="HEXをコピー"
          glass={glass}
          entranceDelay={AB_ENTER_DELAY + 0.06}
        >
          {copied
            ? <IconCheck size={13} style={{ color: glass.accentColor } as React.CSSProperties} />
            : <IconCopy size={13} />
          }
        </TactileButton>

        {/* ── Divider 2（+0.08）── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0, transition: { opacity: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT } } }}
          transition={{
            y:       { delay: AB_ENTER_DELAY + 0.08, duration: ENTER_DUR, ease: EASE_QUINT },
            opacity: { delay: AB_ENTER_DELAY + 0.08, duration: ENTER_DUR, ease: EASE_QUINT },
          }}
          style={{ width: 28, height: 0.5, background: glass.divider, position: 'relative', zIndex: 1, flexShrink: 0 }}
        />

        {/* ── 地層 3〜6: 硝子孔スロット（スタッガー押し出し）── */}
        {miniSlots.map((hex, i) => {
          const isEjecting = ejectingIndex === i
          return (
            <motion.button
              // hex を key に含めることで色変化時にマウントアニメが再発火する（トロリ注入）
              key={`${i}-${hex ?? 'empty'}`}
              initial={{ y: 20, scale: 0.5, opacity: 0 }}
              animate={isEjecting
                // 吸い上げ: HeroDot方向へ飛ばす
                ? { y: -24, scale: 0.2, opacity: 0 }
                : { y: 0, scale: 1, opacity: 1 }
              }
              exit={{ y: -20, scale: 0.7, opacity: 0, transition: {
                y:       { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
                scale:   { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
                opacity: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
              }}}
              onAnimationComplete={() => {
                // 吸い上げアニメ完了後に promoteSlot を実行
                if (isEjecting && hex) {
                  promoteSlot(hex)
                  window.electronAPI?.floatingColorSelected(hex)
                  setEjectingIndex(null)
                }
              }}
              whileTap={isEjecting ? {} : { scale: 0.88 }}
              transition={isEjecting
                ? {
                    y:       { duration: 0.22, ease: EASE_QUINT },
                    scale:   { duration: 0.22, ease: EASE_QUINT },
                    opacity: { duration: 0.18, ease: EASE_QUINT },
                  }
                : {
                    y:       { delay: AB_ENTER_DELAY + 0.10 + i * 0.02, duration: ENTER_DUR, ease: EASE_QUINT },
                    scale:   { delay: AB_ENTER_DELAY + 0.10 + i * 0.02, duration: ENTER_DUR, ease: EASE_QUINT },
                    opacity: { delay: AB_ENTER_DELAY + 0.10 + i * 0.02, duration: ENTER_DUR, ease: EASE_QUINT },
                  }
              }
              onPointerDown={() => !isEjecting && handleSlotPointerDown(i)}
              onPointerUp={() => !isEjecting && handleSlotPointerUp(i, hex)}
              onPointerLeave={() => handleSlotPointerLeave(i)}
              onContextMenu={(e) => { e.preventDefault(); setMiniSlot(i, null) }}
              title={hex
                ? `${hex}（クリック:Active昇格 / 長押し:上書き / 右クリック:解除）`
                : '（クリック:即保存 / ＋:現在色を登録）'}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                background: hex ?? 'transparent',
                border: hex ? 'none' : `0.7px solid ${glass.textExtra}`,
                cursor: isEjecting ? 'default' : 'pointer',
                flexShrink: 0, position: 'relative', zIndex: 1,
                WebkitAppRegion: 'no-drag', padding: 0, display: 'block',
              } as React.CSSProperties}
            />
          )
        })}

        {/* ── 地層 7: ＋ボタン ── */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, scale: 0.7, opacity: 0, transition: {
            y:       { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
            scale:   { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
            opacity: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
          }}}
          whileTap={{ scale: 0.88 }}
          transition={{
            y:       { delay: AB_ENTER_DELAY + 0.18, duration: ENTER_DUR, ease: EASE_QUINT },
            opacity: { delay: AB_ENTER_DELAY + 0.18, duration: ENTER_DUR, ease: EASE_QUINT },
            scale:   { type: 'spring', stiffness: 300, damping: 30 },
          }}
          onClick={handlePushSlot}
          title="現在色をスロットに追加"
          style={{
            width: 22, height: 22, borderRadius: '50%',
            background: glass.accentBg, border: `0.5px solid ${glass.accentBorder}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: glass.accentColor,
            flexShrink: 0, position: 'relative', zIndex: 1,
            WebkitAppRegion: 'no-drag', padding: 0,
          } as React.CSSProperties}
        >
          <IconPlus size={10} />
        </motion.button>

        {/* ── 地層 8: Dock 展開ボタン ── */}
        <TactileButton
          onClick={() => setDockOpen(v => !v)}
          title={dockOpen ? 'Dockを閉じる' : 'Dockを開く'}
          glass={glass} active={dockOpen}
          entranceDelay={AB_ENTER_DELAY + 0.20}
        >
          <IconFolder size={13} />
        </TactileButton>

        {/* ── 地層 9: Dark/Light 切替 ── */}
        <TactileButton
          onClick={handleToggleTheme}
          title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          glass={glass}
          entranceDelay={AB_ENTER_DELAY + 0.22}
        >
          {isDark ? <IconSun size={13} /> : <IconMoon size={13} />}
        </TactileButton>
      </motion.div>

      {/* ── State C: Handy Dock ── */}
      <AnimatePresence>
        {dockOpen && <HandyDock snapSide={snapSide} onFlash={specular.flash} />}
      </AnimatePresence>
    </div>
  )
}
