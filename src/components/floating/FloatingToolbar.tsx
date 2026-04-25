// src/components/floating/FloatingToolbar.tsx
//
// ── Iris Morph 多段式（B → A）──────────────────────────────────────
//   FloatingTab.tsx と対称的な多段停止キーフレームで逆再生を実現
//
//   A→B enter: FloatingTab の P3_BDOT 静止中（t=0.68s）から開花
//     initial = 微小ドット → delay 後にスプリングで全開
//
//   B→A exit: Toolbar が収束しながら 3 段停止
//     1. 全開 → Toolbar の LiquidDot サイズ(≈4%)で停止
//     2. 一回り大きく → 停止
//     3. 少し小さく → そのまま停止（Tab に引き継ぎ）
//     ★ TB_CLOSE（circle 0%）は使わない = ドットが消える瞬間ゼロ
//
// ── 寸法計算メモ ────────────────────────────────────────────────────
//   FloatingToolbar: 48 × 420 px
//   clip-path circle() 参照値 = √(48²+420²)/√2 ≈ 299 px
//
//   LiquidDot(24px): radius=12 → 12/299 ≈ 4.0%
//   一回り大きい:     radius=15 → 15/299 ≈ 5.0%
//   小さめ:          radius=9  → 9/299  ≈ 3.0%
// ─────────────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { Easing } from 'motion-utils'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'
import { HandyDock } from './HandyDock'
import { SpecularBorder, useSpecularReflection } from './SpecularBorder'
import { usePrefersDark, getGlassTokens, type GlassTokens } from './useTheme'
import {
  IconEyedropper,
  IconCopy,
  IconCheck,
  IconFolder,
  IconMinus,
  IconPlus,
} from '@/components/ui/Icons'

// ── 定数 ────────────────────────────────────────────────────────────
const TOOLBAR_H = 420

// clip-path 定数（Toolbar 空間）
const TB_DOT_POS = '50% 14%'                          // LiquidDot の中心（%）

const TB_OPEN   = `circle(150% at ${TB_DOT_POS})`    // 全開
const TB_P1_DOT = `circle(4%   at ${TB_DOT_POS})`    // フェーズ1: LiquidDot サイズ
const TB_P2_OVER= `circle(5%   at ${TB_DOT_POS})`    // フェーズ2: 一回り大きく
const TB_P3_SM  = `circle(3%   at ${TB_DOT_POS})`    // フェーズ3: 少し小さく（Tab サイズに合わせ）

// ── タイミング（FloatingTab.tsx の TOOLBAR_DELAY=0.68s に同期）──
const TAB_DELAY     = 0.68          // Tab が開花を始めるタイミング（P3 静止中）
const EXIT_DURATION = 0.92          // B→A exit 全体の秒数
const TRIM_DELAY_BA = 1500          // ms: state 変更後、幅 80→幅 80,高さ 32 に縮める猶予
const DOCK_CLOSE_DELAY = 220        // ms: Dock exit 後にリサイズ

// B→A exit キーフレーム（A→B の Tab exit と対称）
//   ★ TB_CLOSE（circle 0%）を使わない → ドットが消える瞬間ゼロ
const EXIT_FRAMES: string[] = [
  TB_OPEN,    // 0.00 → 全開
  TB_P1_DOT,  // 0.28 → LiquidDot サイズへ収束
  TB_P1_DOT,  // 0.43 → ★停止（溜め1）
  TB_P2_OVER, // 0.54 → 一回り大きく
  TB_P2_OVER, // 0.63 → ★停止（溜め2）
  TB_P3_SM,   // 0.76 → 少し小さく（Tab のドットへのハンドオフ）
  TB_P3_SM,   // 1.00 → ★停止したまま Tab に引き継ぎ（消えない）
]

const EXIT_TIMES: number[] = [0, 0.28, 0.43, 0.54, 0.63, 0.76, 1.0]
const EXIT_EASES: Easing[] = ['easeIn', 'linear', 'easeInOut', 'linear', 'easeInOut', 'linear']

// スプリング
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
  title, children, glass, active,
}: {
  onClick?: () => void
  onPointerDown?: () => void
  onPointerUp?: () => void
  onPointerLeave?: () => void
  title?: string
  children: React.ReactNode
  glass: GlassTokens
  active?: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      title={title}
      whileTap={{ scale: 0.90 }}
      transition={SPRING_TAP}
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
    currentColor, snapSide,
    miniSlots, setMiniSlot, pushMiniSlot,
    setFloatingState, setPendingSaveAfterPick,
  } = useFloatingStore()

  const [copied, setCopied]       = useState(false)
  const [dockOpen, setDockOpen]   = useState(false)
  const [eyeLongActive, setEyeLongActive] = useState(false)

  const copyTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slotTimers     = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const trimTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eyeTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDark   = usePrefersDark()
  const glass    = getGlassTokens(isDark)
  const specular = useSpecularReflection({ accentHex: currentColor.hex })

  // ── エントリ閃光（Toolbar が全開に近づいた頃）──────────────────
  useEffect(() => {
    const t = setTimeout(() => specular.flash(), (TAB_DELAY + 0.4) * 1000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── コピー（Step 7: 鼓動フラッシュ）──────────────────────────────
  const handleCopyHex = useCallback(() => {
    copyToClipboard(currentColor.hex)
    setCopied(true)
    specular.flash()
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
  }, [currentColor.hex, specular])

  // ── ドットダブルクリック（Step 5: 即保存）──────────────────────
  const handleDotDoubleClick = useCallback(() => {
    window.electronAPI?.floatingColorSelected(currentColor.hex)
    specular.flash()
  }, [currentColor.hex, specular])

  // ── スポイト（Step 5: 長押し 450ms = 保存フラグ ON）───────────
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

  // ── スロット操作 ────────────────────────────────────────────────
  const handleRegisterSlot = useCallback((i: number) => setMiniSlot(i, currentColor.hex), [currentColor.hex, setMiniSlot])
  const handleSlotSelect   = useCallback((hex: string | null) => { if (hex) window.electronAPI?.floatingColorSelected(hex) }, [])

  const handleSlotPointerDown = useCallback((i: number) => {
    slotTimers.current.set(i, setTimeout(() => { slotTimers.current.delete(i); setMiniSlot(i, currentColor.hex) }, 450))
  }, [currentColor.hex, setMiniSlot])

  const handleSlotPointerUp = useCallback((i: number, hex: string | null) => {
    const t = slotTimers.current.get(i); if (!t) return
    clearTimeout(t); slotTimers.current.delete(i)
    if (hex) handleSlotSelect(hex); else handleRegisterSlot(i)
  }, [handleSlotSelect, handleRegisterSlot])

  const handleSlotPointerLeave = useCallback((i: number) => {
    const t = slotTimers.current.get(i)
    if (t) { clearTimeout(t); slotTimers.current.delete(i) }
  }, [])

  // ── プッシュスロット ──────────────────────────────────────────
  const handlePushSlot = useCallback(() => {
    pushMiniSlot(currentColor.hex)
    specular.flash()
  }, [currentColor.hex, pushMiniSlot, specular])

  // ── 縮小（B → A）──────────────────────────────────────────────
  const handleShrink = useCallback(() => {
    setDockOpen(false)  // Dock が開いていれば閉じる
    const anchor = snapSide === 'right' ? 'right' : 'left'
    // 先行リサイズ
    window.electronAPI?.requestFloatingResize({ width: 80, height: TOOLBAR_H, anchor })
    delayTimerRef.current = setTimeout(() => {
      setFloatingState('tab')
      trimTimerRef.current = setTimeout(() => {
        window.electronAPI?.requestFloatingResize({ width: 80, height: 32, anchor: 'center' })
      }, TRIM_DELAY_BA)
    }, 60)
  }, [setFloatingState, snapSide])

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

  // ── Dock 開閉リサイズ ──────────────────────────────────────────
  useEffect(() => {
    const anchor = snapSide === 'right' ? 'right' : 'left'
    if (dockOpen) {
      window.electronAPI?.requestFloatingResize({ width: 372, height: TOOLBAR_H, anchor })
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
        // ── A→B enter: FloatingTab の P3 静止中（delay=0.68s）から小ドットが開花 ──
        initial={{ clipPath: TB_P1_DOT }}
        animate={{ clipPath: TB_OPEN }}
        // ── B→A exit: 多段停止キーフレーム（Tab exit の対称） ──
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
        // ── A→B enter transition: Tab の P3_BDOT 静止中に開花 ──
        transition={{
          clipPath: {
            delay: TAB_DELAY,
            type: 'spring',
            stiffness: 180,
            damping: 20,
            mass: 1.0,
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
        {/* 1.4px 色の記憶シャモファー */}
        <SpecularBorder
          borderRadius={24}
          background={specular.background}
          opacity={specular.opacity}
        />

        {/* ── 地層 1: 縮小ボタン ── */}
        <motion.button
          onClick={handleShrink}
          whileTap={{ scale: 0.90 }}
          transition={SPRING_TAP}
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

        {/* ── 地層 2: LiquidDot（ダブルクリックで即保存）── */}
        <div
          onDoubleClick={handleDotDoubleClick}
          title="現在色（ダブルクリックで即保存）"
          style={{
            flexShrink: 0, position: 'relative', zIndex: 1,
            cursor: 'pointer', WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          <LiquidDot hex={currentColor.hex} size={24} />
        </div>

        {/* Divider */}
        <div style={{ width: 28, height: 0.5, background: glass.divider, position: 'relative', zIndex: 1, flexShrink: 0 }} />

        {/* ── スポイト（長押し 450ms = 保存フラグ ON）── */}
        <TactileButton
          onPointerDown={handleEyePointerDown}
          onPointerUp={handleEyePointerUp}
          onPointerLeave={handleEyePointerLeave}
          title="スポイト（長押し：取得後に自動保存）"
          glass={glass} active={eyeLongActive}
        >
          <IconEyedropper size={13} />
        </TactileButton>

        {/* ── コピー ── */}
        <TactileButton onClick={handleCopyHex} title="HEXをコピー" glass={glass}>
          {copied
            ? <IconCheck size={13} style={{ color: glass.accentColor } as React.CSSProperties} />
            : <IconCopy size={13} />
          }
        </TactileButton>

        {/* Divider */}
        <div style={{ width: 28, height: 0.5, background: glass.divider, position: 'relative', zIndex: 1, flexShrink: 0 }} />

        {/* ── 地層 3〜6: ミニスロット 4個（色あり=枠線なし）── */}
        {miniSlots.map((hex, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.88 }}
            transition={SPRING_TAP}
            onPointerDown={() => handleSlotPointerDown(i)}
            onPointerUp={() => handleSlotPointerUp(i, hex)}
            onPointerLeave={() => handleSlotPointerLeave(i)}
            onContextMenu={(e) => { e.preventDefault(); setMiniSlot(i, null) }}
            title={hex ? `${hex}（クリック:適用 / 長押し:上書き / 右クリック:解除）` : '（長押しで登録）'}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: hex ?? glass.buttonBg,
              border: hex ? 'none' : `0.5px dashed ${glass.buttonBorder}`,
              cursor: 'pointer',
              flexShrink: 0, position: 'relative', zIndex: 1,
              WebkitAppRegion: 'no-drag', padding: 0, display: 'block',
            } as React.CSSProperties}
          />
        ))}

        {/* ── 地層 7: ＋ボタン ── */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={SPRING_TAP}
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

        {/* ── 底部の溜まり（ガラス曲面を見せる余白）── */}
        <div style={{ flex: 1, minHeight: 12 }} />

        {/* ── Dock 展開ボタン ── */}
        <TactileButton
          onClick={() => setDockOpen(v => !v)}
          title={dockOpen ? 'Dockを閉じる' : 'Dockを開く'}
          glass={glass} active={dockOpen}
        >
          <IconFolder size={13} />
        </TactileButton>
      </motion.div>

      {/* ── State C: Handy Dock ── */}
      <AnimatePresence>
        {dockOpen && <HandyDock snapSide={snapSide} onFlash={specular.flash} />}
      </AnimatePresence>
    </div>
  )
}
