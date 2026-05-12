// src/components/floating/FloatingToolbar.tsx
//
// ── デザインベース: 637f4a9 ────────────────────────────────────────────
//   glass tokens でテーマ即時反映 / TactileButton 28px / スロット 14px
//   24px 真円: 開閉ボタン・HeroDot・下部アクション
//   Specular + ColorBleed 全周 / 動的スロット数（高さ連動）
//
// ── 操作 ──────────────────────────────────────────────────────────────
//   HeroDot シングルクリック: 保存 + Accent Ring
//   HeroDot ダブルクリック:  B → Main（explosionPending）
//   開閉ボタン:               B → A（カプセルへ）
//   スロット クリック:        currentColor ↔ スロット色 swap
//   右クリック:               ガラスコンテキストメニュー

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { Easing } from 'motion-utils'
import { useFloatingStore } from '@/store/floatingStore'
import { HandyDock } from './HandyDock'
import { SpecularBorder, ColorBleed, useSpecularReflection } from './SpecularBorder'
import { getGlassTokens } from './useTheme'
import { FloatingContextMenu } from './FloatingContextMenu'
import type { ContextMenuItem } from './FloatingContextMenu'
import {
  IconCaretLeft,
  IconCaretRight,
  IconEyedropper,
  IconFolder,
  IconSun,
  IconMoon,
  IconFloppyDisk,
  IconCopy,
  IconPalette,
} from '@/components/ui/Icons'

// ── Eraser アイコンを Phosphor から直接 import（Icons.tsx 未登録） ──
import { Eraser as IconEraser } from '@phosphor-icons/react'

// ── 定数（変更禁止）──────────────────────────────────────────────────
const SCREEN_H = typeof window !== 'undefined' ? window.screen.availHeight : 800

// clip-path（px 絶対値）
const TB_DOT_POS    = '24px 58px'
const TB_OPEN       = `circle(150% at ${TB_DOT_POS})`
const TB_DOT_ORIGIN = `circle(12px at ${TB_DOT_POS})`

const AB_ENTER_DELAY   = 0.914
const AB_ENTER_DUR     = 0.36
const BA_EXIT_DUR        = 0.55
const BA_BUTTON_EXIT_DUR = 0.22
const BA_BG_EXIT_DELAY   = 0.00
const TRIM_DELAY_BA      = 1700
const DOCK_CLOSE_DELAY   = 220

const EASE_QUINT: Easing = [0.8, 0, 0.6, 1] as Easing
const ENTER_DUR = 0.30

// ── スロット計算 ───────────────────────────────────────────────────────
// FIXED_H: 0スロット時の高さ（gap:8 で全要素を積んだ合計）
// BASE_H: 最小スロット数（4本）での高さ
// TactileButton が 32px ラッパー（旧 24px 直置き）に変更されたため +24px 更新済み
const FIXED_H    = 234   // スロットなしの固定要素合計（TactileButton×3 が 32px ラッパーに変更）
const SLOT_STEP  = 22    // 14px dot + 8px gap（flex gap と同じ）
const MIN_SLOTS  = 4
export const BASE_H = FIXED_H + MIN_SLOTS * SLOT_STEP  // ≈ 298px
export const MAX_H  = 400

export function calcSlotCount(h: number): number {
  if (h <= BASE_H) return MIN_SLOTS
  return MIN_SLOTS + Math.floor((h - BASE_H) / SLOT_STEP)
}

// ── TactileButton ────────────────────────────────────────────────────
interface TactileButtonProps {
  onClick?: () => void
  onPointerDown?: () => void
  onPointerUp?: () => void
  onPointerLeave?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  title?: string
  children: React.ReactNode
  active?: boolean
  isDark: boolean
  entranceDelay?: number
  size?: number
  /** ヒットボックスサイズ（ビジュアルは size のまま、当たり判定のみ拡張） */
  hitbox?: number
}

function TactileButton({
  onClick, onPointerDown, onPointerUp, onPointerLeave, onContextMenu,
  title, children, active, isDark, entranceDelay, size = 24, hitbox = 32,
}: TactileButtonProps) {
  const glass = getGlassTokens(isDark)
  const hasEntrance = entranceDelay !== undefined
  return (
    // 透明コンテナ: ヒットボックスのみ拡張（ビジュアルに影響しない）
    <div style={{
      width: hitbox, height: hitbox,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, WebkitAppRegion: 'no-drag',
    } as React.CSSProperties}>
      <motion.button
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onContextMenu={onContextMenu}
        title={title}
        initial={hasEntrance ? { y: 20, opacity: 0 } : undefined}
        animate={hasEntrance ? { y: 0, opacity: 1 } : undefined}
        exit={{ y: -20, scale: 0.7, opacity: 0, transition: {
          y:       { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
          scale:   { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
          opacity: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
        }}}
        whileTap={{ scale: 0.88 }}
        transition={hasEntrance ? {
          y:       { delay: entranceDelay, duration: ENTER_DUR, ease: EASE_QUINT },
          opacity: { delay: entranceDelay, duration: ENTER_DUR, ease: EASE_QUINT },
          scale:   { type: 'spring', stiffness: 300, damping: 30 },
        } : { type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          // ④ LED active: 背景・ボーダーは常に非アクティブと同一。アイコン自発光のみで状態表現
          background: glass.buttonBg,
          border: `0.5px solid ${glass.buttonBorder}`,
          borderRadius: '50%',
          width: size, height: size,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          color: active ? glass.accentColor : glass.textMuted,
          padding: 0,
          WebkitAppRegion: 'no-drag',
          flexShrink: 0, position: 'relative', zIndex: 1,
        } as React.CSSProperties}
      >
        {/* active 時: アイコン形状に沿った LED グロー（drop-shadow は透過形状対応） */}
        <span style={active ? {
          filter: `drop-shadow(0 0 6px ${glass.accentSolid})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        } : undefined}>
          {children}
        </span>
      </motion.button>
    </div>
  )
}

// ── FloatingToolbar ──────────────────────────────────────────────────
export function FloatingToolbar({ toolbarHeight, onHeightChange }: {
  toolbarHeight: number
  onHeightChange: (h: number) => void
}) {
  const {
    currentColor, snapSide,
    miniSlots, setMiniSlot, swapWithSlot,
    setFloatingState, setPendingSaveAfterPick,
    setExplosionPending, setBToMainPending,
    setSaveFlash, eyeActive, setEyeActive,
  } = useFloatingStore()

  // テーマ: local state で即時反映
  const [isDark, setIsDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const glass    = getGlassTokens(isDark)
  const specular = useSpecularReflection({ accentHex: currentColor.hex, isDark })

  const [dockOpen, setDockOpen]          = useState(false)
  const [flashingSlot, setFlashingSlot]  = useState<number | null>(null)
  // Blooming フェーズ（A→B 入場アニメーション）が完了したかどうか
  const isBloomingPhaseRef = useRef(true)
  // スポイト: ピッカーが開いた後の pointerLeave でリセットしないフラグ
  const pickerOpenedRef    = useRef(false)

  // コンテキストメニュー
  const [dotMenu, setDotMenu]   = useState<{ x: number; y: number } | null>(null)
  const [slotMenu, setSlotMenu] = useState<{ x: number; y: number; index: number } | null>(null)
  const menuWindowExpandedRef = useRef(false)

  const trimTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eyeTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickCountRef    = useRef(0)

  useEffect(() => {
    // Blooming フェーズ終了タイマー（最後スロットの入場完了後）
    const lastSlotDelay = (AB_ENTER_DELAY + 0.08 + (MIN_SLOTS - 1) * 0.02 + 0.15) * 1000
    const bloomTimer = setTimeout(() => { isBloomingPhaseRef.current = false }, lastSlotDelay)
    return () => {
      clearTimeout(bloomTimer)
      if (trimTimerRef.current)     clearTimeout(trimTimerRef.current)
      if (delayTimerRef.current)    clearTimeout(delayTimerRef.current)
      if (eyeTimerRef.current)      clearTimeout(eyeTimerRef.current)
      if (clickTimerRef.current)    clearTimeout(clickTimerRef.current)
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
    }
  }, [])

  // スロット数をツールバー高さから計算して miniSlots 長を同期
  const slotCount = calcSlotCount(toolbarHeight)
  useEffect(() => {
    const { miniSlots: slots } = useFloatingStore.getState()
    if (slots.length === slotCount) return
    if (slotCount > slots.length) {
      // 増加: null で埋める
      const next = [...slots, ...Array(slotCount - slots.length).fill(null)]
      useFloatingStore.setState({ miniSlots: next })
    } else {
      // 減少: 末尾を切る
      useFloatingStore.setState({ miniSlots: slots.slice(0, slotCount) })
    }
  }, [slotCount])

  // ── 保存フラッシュ（HeroDot がほわーんとグロー）────────────────
  const doSaveFlash = useCallback(() => {
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 200)
  }, [setSaveFlash])

  // ── コンテキストメニュー用ウィンドウ拡張ヘルパー ────────────
  const expandForMenu = useCallback((cb: () => void) => {
    // 既存の collapse タイマーをキャンセル（右クリック連打の collapse 競合を防ぐ）
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
    if (!dockOpen && !menuWindowExpandedRef.current) {
      menuWindowExpandedRef.current = true
      const anchor = snapSide === 'right' ? 'right' : 'left'
      window.electronAPI?.requestFloatingResize({ width: 248, height: SCREEN_H, anchor })
      setTimeout(cb, 50)
    } else {
      cb()
    }
  }, [dockOpen, snapSide])

  const collapseAfterMenu = useCallback(() => {
    if (!menuWindowExpandedRef.current || dockOpen) return
    // タイマーで collapse（expandForMenu がキャンセル可能）
    collapseTimerRef.current = setTimeout(() => {
      collapseTimerRef.current = null
      if (!menuWindowExpandedRef.current || dockOpen) return
      menuWindowExpandedRef.current = false
      const anchor = snapSide === 'right' ? 'right' : 'left'
      window.electronAPI?.requestFloatingResize({ width: 48, height: SCREEN_H, anchor })
    }, 100)
  }, [dockOpen, snapSide])

  // ── HeroDot クリック（シングル/ダブル判定）────────────────────
  const handleDotClick = useCallback(() => {
    clickCountRef.current += 1
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => {
      const count = clickCountRef.current
      clickCountRef.current = 0
      if (count === 1) {
        // シングル → 保存フラッシュ
        window.electronAPI?.floatingSaveColor?.({
          hex: currentColor.hex,
          alpha: currentColor.alpha,
          name: currentColor.name ?? currentColor.hex,
        })
        doSaveFlash()
      } else {
        // ダブル → B→Main（explosionPending + BToMainPending 両方セット）
        setExplosionPending(true)
        setBToMainPending(true)
        setDockOpen(false)
        const anchor = snapSide === 'right' ? 'right' : 'left'
        window.electronAPI?.requestFloatingResize({ width: 80, height: toolbarHeight, anchor })
        delayTimerRef.current = setTimeout(() => {
          setFloatingState('tab')
        }, 60)
      }
    }, 220)
  }, [currentColor, snapSide, toolbarHeight, doSaveFlash, setExplosionPending, setBToMainPending, setFloatingState])

  // ── HeroDot 右クリックメニュー ────────────────────────────────
  const handleDotContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setSlotMenu(null)  // スロットメニューを閉じる（排他）
    const clientY = e.clientY
    expandForMenu(() => setDotMenu({ x: 56, y: clientY }))
  }, [expandForMenu])

  const dotMenuItems: ContextMenuItem[] = [
    {
      icon: <IconFloppyDisk size={14} />,
      label: 'ライブラリへ保存',
      onClick: () => {
        window.electronAPI?.floatingSaveColor?.({
          hex: currentColor.hex,
          alpha: currentColor.alpha,
          name: currentColor.name ?? currentColor.hex,
        })
        doSaveFlash()
      },
    },
    {
      icon: <IconCopy size={14} />,
      label: 'HEXをコピー',
      onClick: () => navigator.clipboard.writeText(currentColor.hex),
    },
    {
      icon: <IconPalette size={14} />,
      label: 'RGBをコピー',
      onClick: () => {
        const hex = currentColor.hex.replace('#', '')
        const r = parseInt(hex.slice(0,2), 16)
        const g = parseInt(hex.slice(2,4), 16)
        const b = parseInt(hex.slice(4,6), 16)
        navigator.clipboard.writeText(`rgb(${r}, ${g}, ${b})`)
      },
    },
  ]

  // ── スポイト ──────────────────────────────────────────────────
  const handleEyePointerDown = useCallback(() => {
    setEyeActive(true)
    pickerOpenedRef.current = false
    eyeTimerRef.current = setTimeout(() => {
      eyeTimerRef.current = null
      setPendingSaveAfterPick(true)  // 450ms 長押し: 取得後に自動保存
    }, 450)
  }, [setEyeActive, setPendingSaveAfterPick])

  const handleEyePointerUp = useCallback(() => {
    // タイマーがまだ生きていれば短押し → キャンセル（自動保存しない）
    if (eyeTimerRef.current) { clearTimeout(eyeTimerRef.current); eyeTimerRef.current = null }
    pickerOpenedRef.current = true  // ピッカー開放中: pointerLeave でリセットしない
    window.electronAPI?.startScreenPicker()
    // eyeActive は FloatingSystemView の onFloatingColorFromPicker でリセット
  }, [])

  const handleEyePointerLeave = useCallback(() => {
    if (pickerOpenedRef.current) return  // ピッカー使用中は何もしない
    if (eyeTimerRef.current) { clearTimeout(eyeTimerRef.current); eyeTimerRef.current = null }
    setEyeActive(false)
    setPendingSaveAfterPick(false)
  }, [setEyeActive, setPendingSaveAfterPick])

  // ── テーマ切替 ─────────────────────────────────────────────────
  const handleToggleTheme = useCallback(() => {
    const next = !isDark
    setIsDark(next)
    window.electronAPI?.setTheme?.(next ? 'dark' : 'light')
  }, [isDark])

  // ── スロット操作 ───────────────────────────────────────────────
  const handleSlotClick = useCallback((i: number, hex: string | null) => {
    if (hex) {
      // 有色スロット → swap
      swapWithSlot(i)
      window.electronAPI?.floatingColorSelected(hex)
    } else {
      // 空スロット → 最新 state で同色チェック後に登録（stale closure 回避）
      const { currentColor: c, miniSlots: slots } = useFloatingStore.getState()
      if (slots.some(s => s === c.hex)) return
      window.electronAPI?.floatingSaveColor?.({ hex: c.hex, alpha: c.alpha, name: c.name ?? c.hex })
      window.electronAPI?.floatingColorSelected(c.hex)
      setMiniSlot(i, c.hex)
    }
  }, [setMiniSlot, swapWithSlot])

  const handleSlotContextMenu = useCallback((e: React.MouseEvent, i: number) => {
    e.preventDefault()
    setDotMenu(null)  // HeroDot メニューを閉じる（排他）
    const clientY = e.clientY
    expandForMenu(() => setSlotMenu({ x: 56, y: clientY, index: i }))
  }, [expandForMenu])

  // ── 縮小（B → A）─────────────────────────────────────────────
  const handleShrink = useCallback(() => {
    setDockOpen(false)
    const anchor = snapSide === 'right' ? 'right' : 'left'
    window.electronAPI?.requestFloatingResize({ width: 80, height: SCREEN_H, anchor })
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
      window.electronAPI?.requestFloatingResize({ width: 352, height: SCREEN_H, anchor })
      return
    }
    const timer = setTimeout(() => {
      window.electronAPI?.requestFloatingResize({ width: 48, height: SCREEN_H, anchor })
    }, DOCK_CLOSE_DELAY)
    return () => clearTimeout(timer)
  }, [dockOpen, snapSide])

  const isDockLeft = snapSide !== 'right'
  const caretIcon  = snapSide === 'right'
    ? <IconCaretRight size={10} weight="bold" />
    : <IconCaretLeft  size={10} weight="bold" />

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isDockLeft ? 'row' : 'row-reverse',
        alignItems: 'flex-start',
        height: SCREEN_H,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {/* ── Toolbar 本体 ── */}
      <motion.div
        initial={{ clipPath: TB_DOT_ORIGIN, opacity: 0 }}
        animate={{ clipPath: TB_OPEN, opacity: 1 }}
        exit={{
          clipPath: TB_DOT_ORIGIN,
          transition: {
            clipPath: { delay: BA_BG_EXIT_DELAY, duration: BA_EXIT_DUR, ease: EASE_QUINT },
          },
        }}
        transition={{
          opacity:  { delay: AB_ENTER_DELAY, duration: 0.008, ease: 'linear' },
          clipPath: { delay: AB_ENTER_DELAY, duration: AB_ENTER_DUR, ease: EASE_QUINT },
        }}
        onMouseMove={specular.handleMouseMove}
        onMouseLeave={specular.handleMouseLeave}
        style={{
          position: 'relative',
          width: 48,
          height: toolbarHeight,
          borderRadius: 24,
          background: glass.background,
          backdropFilter: glass.backdropFilter,
          WebkitBackdropFilter: glass.backdropFilter,
          boxShadow: glass.boxShadow,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: 8,
          WebkitAppRegion: 'drag',
          flexShrink: 0,
          overflow: 'visible',
        } as React.CSSProperties}
      >
        <ColorBleed borderRadius={24} innerGlow={specular.innerGlow} innerGlowOpacity={specular.innerGlowOpacity} />
        <SpecularBorder borderRadius={24} background={specular.background} opacity={specular.opacity} />

        {/* ── 開閉ボタン（B → A）── */}
        <motion.button
          onClick={handleShrink}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, scale: 0.7, opacity: 0, transition: {
            y:       { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
            scale:   { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
            opacity: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
          }}}
          whileTap={{ scale: 0.88 }}
          transition={{
            y:       { delay: AB_ENTER_DELAY + 0.00, duration: ENTER_DUR, ease: EASE_QUINT },
            opacity: { delay: AB_ENTER_DELAY + 0.00, duration: ENTER_DUR, ease: EASE_QUINT },
            scale:   { type: 'spring', stiffness: 300, damping: 30 },
          }}
          title="カプセルに戻す"
          style={{
            background: glass.buttonBg,
            border: `0.5px solid ${glass.buttonBorder}`,
            borderRadius: '50%',
            width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: glass.textMuted, padding: 0,
            WebkitAppRegion: 'no-drag',
            position: 'relative', zIndex: 1, flexShrink: 0,
          } as React.CSSProperties}
        >
          {caretIcon}
        </motion.button>

        {/* ── HeroDot スペーサー（実体は FloatingSystemView の HeroDot） ── */}
        {/* ヒットボックス 30px > ビジュアル 24px: 操作の遊びを確保 */}
        <div
          onClick={handleDotClick}
          onContextMenu={handleDotContextMenu}
          title="クリック:保存 / ダブルクリック:メインへ"
          style={{
            position: 'relative',
            width: 30, height: 30, flexShrink: 0,
            borderRadius: 15,
            cursor: 'pointer', WebkitAppRegion: 'no-drag',
            zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          } as React.CSSProperties}
        />

        {/* ── Divider 1 ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: BA_BUTTON_EXIT_DUR } }}
          transition={{ delay: AB_ENTER_DELAY + 0.02, duration: ENTER_DUR, ease: EASE_QUINT }}
          style={{ width: 28, height: 0.5, background: glass.divider, flexShrink: 0, zIndex: 1, position: 'relative' }}
        />

        {/* ── Eyedropper ── */}
        <TactileButton
          onPointerDown={handleEyePointerDown}
          onPointerUp={handleEyePointerUp}
          onPointerLeave={handleEyePointerLeave}
          title="スポイト（長押し：取得後に自動保存）"
          active={eyeActive}
          isDark={isDark}
          entranceDelay={AB_ENTER_DELAY + 0.04}
        >
          <IconEyedropper size={14} weight={eyeActive ? 'fill' : 'regular'} />
        </TactileButton>

        {/* ── Divider 2 ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: BA_BUTTON_EXIT_DUR } }}
          transition={{ delay: AB_ENTER_DELAY + 0.06, duration: ENTER_DUR, ease: EASE_QUINT }}
          style={{ width: 28, height: 0.5, background: glass.divider, flexShrink: 0, zIndex: 1, position: 'relative' }}
        />

        {/* ── Mini Slots（動的数）── */}
        {miniSlots.slice(0, slotCount).map((hex, i) => {
          const inBlooming = isBloomingPhaseRef.current
          const bloomDelay = AB_ENTER_DELAY + 0.08 + i * 0.02
          return (
            <motion.button
              key={`slot-${i}-${hex ?? 'empty'}`}
              // Blooming: y+scale+opacity でスタッガー入場（clip は即全開）
              // 通常登録: 中心から色が満ちる clip-path アニメーション
              initial={inBlooming
                ? { y: 4, scale: 0.6, opacity: 0 }
                : { scale: 1, opacity: 1, y: 0 }
              }
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -4, scale: 0.7, opacity: 0, transition: {
                y:       { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
                scale:   { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
                opacity: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
              }}}
              whileTap={{ scale: 0.85 }}
              transition={{
                y:       inBlooming ? { delay: bloomDelay, duration: 0.15, ease: EASE_QUINT } : { duration: 0 },
                scale:   inBlooming ? { delay: bloomDelay, duration: 0.15, ease: EASE_QUINT } : { duration: 0 },
                opacity: inBlooming ? { delay: bloomDelay, duration: 0.15, ease: EASE_QUINT } : { duration: 0 },
              }}
              onClick={() => handleSlotClick(i, hex)}
              onContextMenu={(e) => handleSlotContextMenu(e, i)}
              title={hex
                ? `${hex}（クリック:Swap）`
                : '（クリック:現在色を登録）'}
              style={{
                // ⑥ layout は 14×14 のまま、overflow:visible で内側の透明ヒット拡張層を通す
                width: 14, height: 14, borderRadius: '50%',
                background: 'transparent', border: 'none',
                cursor: 'pointer', flexShrink: 0, position: 'relative', zIndex: 1,
                WebkitAppRegion: 'no-drag', padding: 0, overflow: 'visible',
              } as React.CSSProperties}
            >
              {/* ⑥ 透明ヒット拡張層: 5px 外側に延びて 24×24 の当たり判定を形成 */}
              <div style={{
                position: 'absolute',
                top: -5, left: -5, right: -5, bottom: -5,
                borderRadius: '50%', zIndex: 0,
              }} />
              {/* 視覚: 14px 色円。clipPath で登録時の「色が中心から膨らむ」アニメーション */}
              <motion.div
                initial={{ clipPath: inBlooming ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)' }}
                animate={{ clipPath: 'circle(150% at 50% 50%)' }}
                transition={{ clipPath: inBlooming ? { duration: 0 } : { duration: 0.18, ease: [0.2, 0, 0.4, 1] as Easing } }}
                style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50%',
                  background: hex ?? 'transparent',
                  border: hex ? 'none' : `0.7px solid ${glass.textExtra}`,
                  pointerEvents: 'none', zIndex: 1,
                  boxShadow: flashingSlot === i
                    ? `0 0 0 1.5px ${glass.accentSolid}`
                    : hex
                      ? isDark
                        ? '0 0 0 1px rgba(255,255,255,0.18), 0 0 0 2px rgba(0,0,0,0.30)'
                        : '0 0 0 1px rgba(0,0,0,0.14), 0 0 0 2px rgba(255,255,255,0.60)'
                      : '0 0 0 0px transparent',
                  transition: 'box-shadow 0.8s ease-out',
                } as React.CSSProperties}
              />
            </motion.button>
          )
        })}

        {/* ── Divider 3 ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: BA_BUTTON_EXIT_DUR } }}
          transition={{ delay: AB_ENTER_DELAY + 0.16, duration: ENTER_DUR, ease: EASE_QUINT }}
          style={{ width: 28, height: 0.5, background: glass.divider, flexShrink: 0, zIndex: 1, position: 'relative' }}
        />

        {/* ── テーマ切替 ── */}
        <TactileButton
          onClick={handleToggleTheme}
          title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          isDark={isDark}
          entranceDelay={AB_ENTER_DELAY + 0.18}
        >
          {isDark ? <IconSun size={14} weight="bold" /> : <IconMoon size={14} weight="bold" />}
        </TactileButton>

        {/* ── Dock 展開ボタン ── */}
        <TactileButton
          onClick={() => setDockOpen(v => !v)}
          title={dockOpen ? 'Dockを閉じる' : 'Dockを開く'}
          active={dockOpen}
          isDark={isDark}
          entranceDelay={AB_ENTER_DELAY + 0.20}
        >
          <IconFolder size={14} weight={dockOpen ? 'fill' : 'regular'} />
        </TactileButton>
      </motion.div>

      {/* ── State C: Handy Dock ── */}
      <AnimatePresence>
        {dockOpen && (
          <HandyDock
            snapSide={snapSide}
            onFlash={specular.flash}
            height={toolbarHeight}
            onHeightChange={onHeightChange}
          />
        )}
      </AnimatePresence>

      {/* ── コンテキストメニュー: HeroDot ── */}
      <FloatingContextMenu
        open={dotMenu !== null}
        x={dotMenu?.x ?? 0}
        y={dotMenu?.y ?? 0}
        items={dotMenuItems}
        isDark={isDark}
        onClose={() => { setDotMenu(null); collapseAfterMenu() }}
      />

      {/* ── コンテキストメニュー: スロット ── */}
      <FloatingContextMenu
        open={slotMenu !== null}
        x={slotMenu?.x ?? 0}
        y={slotMenu?.y ?? 0}
        isDark={isDark}
        onClose={() => { setSlotMenu(null); collapseAfterMenu() }}
        items={slotMenu !== null ? [
          {
            icon: <IconEraser size={14} />,
            label: 'スロットをクリア',
            onClick: () => setMiniSlot(slotMenu.index, null),
            danger: true,
          },
          {
            icon: <IconFloppyDisk size={14} />,
            label: 'この色を保存',
            onClick: () => {
              const idx = slotMenu.index
              const hex = miniSlots[idx]
              if (!hex) return
              window.electronAPI?.floatingSaveColor?.({ hex, alpha: 1, name: hex })
              // HeroDot ではなくそのスロットのリングをフラッシュ
              setFlashingSlot(idx)
              setTimeout(() => setFlashingSlot(null), 350)
            },
          },
        ] : []}
      />
    </div>
  )
}
