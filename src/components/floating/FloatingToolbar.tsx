// src/components/floating/FloatingToolbar.tsx
//
// Step 1: Iris morph + 地層ごとのスタガー降下（核の降下と開花）
// Step 2: 色の記憶シャモファー（accentHex → SpecularBorder へ）
// Step 3: 縮小→ドット→スポイト→スロット×4→+ボタン→Dock の垂直地層
// Step 5: スポイト長押し 450ms で保存フラグ、ドットダブルタップで即保存
// Step 7: 保存/コピー成功時に鼓動フラッシュ

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useRef, useEffect } from 'react'
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

// ── 定数 ────────────────────────────────────────────────────────
// Toolbar の高さ（FloatingTab.tsx の TOOLBAR_H と同値）
const TOOLBAR_H = 420

// Iris morph: Toolbar 内 LiquidDot 中心（%）
// padding-top:12 + shrinkBtn:26 + gap:8 + dot24/2:12 = 58px / 420px ≈ 14%
const DOT_POS    = '50% 14%'
const CLIP_OPEN  = `circle(150% at ${DOT_POS})`
const CLIP_CLOSE = `circle(0% at ${DOT_POS})`

// Step 1: 溜め（hold）= Toolbar iris open の遅延
// Tab exit が ~0.2s で完了 → さらに 0.08s の沈黙が「溜め」を生む
const IRIS_HOLD_DELAY = 0.28

// B→A: trim 猶予
const TRIM_DELAY = 700
// Dock close: 縮小猶予
const DOCK_CLOSE_DELAY = 220

// スプリング
const SPRING_TAP = { type: 'spring', stiffness: 300, damping: 30 } as const

// Step 3 地層スタガー — 各要素が上から順に降下してくる
const STAGGER_CONTAINER = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: IRIS_HOLD_DELAY } },
  exit:    { transition: { staggerChildren: 0.035, staggerDirection: -1 as const } },
} as const

const STAGGER_ITEM = {
  hidden:  { opacity: 0, y: -10 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 340, damping: 28 },
  },
  exit: {
    opacity: 0, y: -6,
    transition: { type: 'spring', stiffness: 300, damping: 30, duration: 0.12 },
  },
} as const

// ── ユーティリティ ───────────────────────────────────────────────
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

// ── 円形タクティルボタン ──────────────────────────────────────
function TactileButton({
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  title,
  children,
  glass,
  active,
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
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: active ? glass.accentColor : glass.textMuted,
        padding: 0,
        WebkitAppRegion: 'no-drag',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
      } as React.CSSProperties}
    >
      {children}
    </motion.button>
  )
}

// ── Divider ──────────────────────────────────────────────────
function Divider({ glass }: { glass: GlassTokens }) {
  return (
    <motion.div
      variants={STAGGER_ITEM}
      style={{
        width: 28, height: 0.5,
        background: glass.divider,
        position: 'relative', zIndex: 1, flexShrink: 0,
      }}
    />
  )
}

// ── FloatingToolbar ──────────────────────────────────────────
export function FloatingToolbar() {
  const {
    currentColor, snapSide,
    miniSlots, setMiniSlot, pushMiniSlot,
    setFloatingState, setPendingSaveAfterPick,
  } = useFloatingStore()

  const [copied, setCopied]     = useState(false)
  const [dockOpen, setDockOpen] = useState(false)
  const [eyeLongActive, setEyeLongActive] = useState(false)

  const copyTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slotTimers      = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const trimTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eyeTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDark   = usePrefersDark()
  const glass    = getGlassTokens(isDark)
  const specular = useSpecularReflection({ accentHex: currentColor.hex })

  // ── エントリ閃光 ────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => specular.flash(), 220)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── コピー（Step 7: コピー成功で鼓動フラッシュ）──────────────
  const handleCopyHex = useCallback(() => {
    copyToClipboard(currentColor.hex)
    setCopied(true)
    specular.flash()
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
  }, [currentColor.hex, specular])

  // ── ドットダブルクリック（Step 5: 即保存 + 鼓動）────────────
  const handleDotDoubleClick = useCallback(() => {
    window.electronAPI?.floatingColorSelected(currentColor.hex)
    specular.flash()
  }, [currentColor.hex, specular])

  // ── スポイト（Step 5: 長押し 450ms = 保存フラグ ON）─────────
  const handleEyePointerDown = useCallback(() => {
    eyeTimerRef.current = setTimeout(() => {
      setEyeLongActive(true)
      setPendingSaveAfterPick(true)
    }, 450)
  }, [setPendingSaveAfterPick])

  const handleEyePointerUp = useCallback(() => {
    if (eyeTimerRef.current) {
      clearTimeout(eyeTimerRef.current)
      eyeTimerRef.current = null
    }
    setEyeLongActive(false)
    window.electronAPI?.startScreenPicker()
  }, [])

  const handleEyePointerLeave = useCallback(() => {
    if (eyeTimerRef.current) {
      clearTimeout(eyeTimerRef.current)
      eyeTimerRef.current = null
    }
    setEyeLongActive(false)
    setPendingSaveAfterPick(false)
  }, [setPendingSaveAfterPick])

  // ── スロット操作 ─────────────────────────────────────────────
  const handleRegisterSlot = useCallback((index: number) => {
    setMiniSlot(index, currentColor.hex)
  }, [currentColor.hex, setMiniSlot])

  const handleSlotSelect = useCallback((hex: string | null) => {
    if (!hex) return
    window.electronAPI?.floatingColorSelected(hex)
  }, [])

  const handleSlotPointerDown = useCallback((i: number) => {
    const timer = setTimeout(() => {
      slotTimers.current.delete(i)
      setMiniSlot(i, currentColor.hex)
    }, 450)
    slotTimers.current.set(i, timer)
  }, [currentColor.hex, setMiniSlot])

  const handleSlotPointerUp = useCallback((i: number, hex: string | null) => {
    const timer = slotTimers.current.get(i)
    if (!timer) return
    clearTimeout(timer)
    slotTimers.current.delete(i)
    if (hex) { handleSlotSelect(hex) } else { handleRegisterSlot(i) }
  }, [handleSlotSelect, handleRegisterSlot])

  const handleSlotPointerLeave = useCallback((i: number) => {
    const timer = slotTimers.current.get(i)
    if (timer) { clearTimeout(timer); slotTimers.current.delete(i) }
  }, [])

  // ── プッシュスロット ──────────────────────────────────────────
  const handlePushSlot = useCallback(() => {
    pushMiniSlot(currentColor.hex)
    specular.flash()
  }, [currentColor.hex, pushMiniSlot, specular])

  // ── 縮小（B → A）────────────────────────────────────────────
  const handleShrink = useCallback(() => {
    const anchor = snapSide === 'right' ? 'right' : 'left'
    window.electronAPI?.requestFloatingResize({ width: 80, height: TOOLBAR_H, anchor })
    setFloatingState('tab')
    if (trimTimerRef.current) clearTimeout(trimTimerRef.current)
    trimTimerRef.current = setTimeout(() => {
      window.electronAPI?.requestFloatingResize({ width: 80, height: 32, anchor: 'center' })
    }, TRIM_DELAY)
  }, [setFloatingState, snapSide])

  // ── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (copyTimerRef.current)  clearTimeout(copyTimerRef.current)
      if (trimTimerRef.current)  clearTimeout(trimTimerRef.current)
      if (eyeTimerRef.current)   clearTimeout(eyeTimerRef.current)
      slotTimers.current.forEach(t => clearTimeout(t))
    }
  }, [])

  // ── Dock 開閉リサイズ ─────────────────────────────────────────
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
      {/* ── Toolbar 本体（48px 幅、完全ピル形）── */}
      <motion.div
        // ── Phase 1/2: Iris open（溜めは IRIS_HOLD_DELAY で実現）──
        initial={{ clipPath: CLIP_CLOSE }}
        animate={{ clipPath: CLIP_OPEN  }}
        exit={{
          clipPath: CLIP_CLOSE,
          transition: {
            clipPath: { type: 'spring', stiffness: 520, damping: 42, mass: 0.35 },
          },
        }}
        transition={{
          clipPath: {
            delay: IRIS_HOLD_DELAY,   // Phase 2: 溜め（LiquidDot から bloom する前の沈黙）
            type: 'spring', stiffness: 180, damping: 20, mass: 0.9,
          },
        }}
        onMouseMove={specular.handleMouseMove}
        onMouseLeave={specular.handleMouseLeave}
        style={{
          position: 'relative',
          width: 48,
          height: TOOLBAR_H,
          borderRadius: 24,          // 完全ピル（Step 2）
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
        {/* 1.4px 色の記憶シャモファー（Step 2）*/}
        <SpecularBorder
          borderRadius={24}
          background={specular.background}
          opacity={specular.opacity}
        />

        {/* ── Step 3: 地層構造（スタガー降下）── */}
        <motion.div
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            flex: 1,
          }}
        >
          {/* ── 地層 1: 縮小ボタン（完全な円形）── */}
          <motion.div variants={STAGGER_ITEM} style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <motion.button
              onClick={handleShrink}
              whileTap={{ scale: 0.90 }}
              transition={SPRING_TAP}
              title="カプセルに戻す"
              style={{
                background: glass.buttonBg,
                border: `0.5px solid ${glass.buttonBorder}`,
                borderRadius: '50%',
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: glass.textExtra,
                padding: 0,
                WebkitAppRegion: 'no-drag',
              } as React.CSSProperties}
            >
              <IconMinus size={12} />
            </motion.button>
          </motion.div>

          {/* ── 地層 2: LiquidDot（アクティブカラー / ダブルクリックで即保存）── */}
          <motion.div
            variants={STAGGER_ITEM}
            onDoubleClick={handleDotDoubleClick}
            title="現在色（ダブルクリックで即保存）"
            style={{
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
              cursor: 'pointer',
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
          >
            <LiquidDot hex={currentColor.hex} size={24} />
          </motion.div>

          <Divider glass={glass} />

          {/* ── 地層 3: スポイト（長押し 450ms = 保存フラグ ON）── */}
          <motion.div variants={STAGGER_ITEM} style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <TactileButton
              onPointerDown={handleEyePointerDown}
              onPointerUp={handleEyePointerUp}
              onPointerLeave={handleEyePointerLeave}
              title="スポイト（長押し：取得後に自動保存）"
              glass={glass}
              active={eyeLongActive}
            >
              <IconEyedropper size={13} />
            </TactileButton>
          </motion.div>

          {/* ── コピー ── */}
          <motion.div variants={STAGGER_ITEM} style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <TactileButton onClick={handleCopyHex} title="HEXをコピー" glass={glass}>
              {copied
                ? <IconCheck size={13} style={{ color: glass.accentColor } as React.CSSProperties} />
                : <IconCopy size={13} />
              }
            </TactileButton>
          </motion.div>

          <Divider glass={glass} />

          {/* ── 地層 3〜6: ミニスロット 4個（枠線なし・アイコンなし）── */}
          {miniSlots.map((hex, i) => (
            <motion.button
              key={i}
              variants={STAGGER_ITEM}
              whileTap={{ scale: 0.88 }}
              transition={SPRING_TAP}
              onPointerDown={() => handleSlotPointerDown(i)}
              onPointerUp={() => handleSlotPointerUp(i, hex)}
              onPointerLeave={() => handleSlotPointerLeave(i)}
              onContextMenu={(e) => { e.preventDefault(); setMiniSlot(i, null) }}
              title={hex
                ? `${hex}（クリック:適用 / 長押し:上書き / 右クリック:解除）`
                : '（現在色を長押しで登録）'
              }
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                // 色が入っているときは枠線なし（Step 3: 枠線なしの色の丸）
                background: hex ?? glass.buttonBg,
                border: hex
                  ? 'none'
                  : `0.5px dashed ${glass.buttonBorder}`,
                cursor: 'pointer',
                flexShrink: 0,
                position: 'relative',
                zIndex: 1,
                WebkitAppRegion: 'no-drag',
                padding: 0,
                display: 'block',
              } as React.CSSProperties}
            />
          ))}

          {/* ── 地層 7: ＋ボタン（現在色をプッシュ）── */}
          <motion.button
            variants={STAGGER_ITEM}
            whileTap={{ scale: 0.88 }}
            transition={SPRING_TAP}
            onClick={handlePushSlot}
            title="現在の色をスロットに追加（古い色は押し出される）"
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: glass.accentBg,
              border: `0.5px solid ${glass.accentBorder}`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: glass.accentColor,
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
              WebkitAppRegion: 'no-drag',
              padding: 0,
            } as React.CSSProperties}
          >
            <IconPlus size={10} />
          </motion.button>

          {/* ── 底部の溜まり: auto で余白を確保してガラスの曲面を見せる ── */}
          <div style={{ flex: 1, minHeight: 12 }} />

          {/* ── Dock 展開ボタン（底部）── */}
          <motion.div variants={STAGGER_ITEM} style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <TactileButton
              onClick={() => setDockOpen(v => !v)}
              title={dockOpen ? 'Dockを閉じる' : 'Dockを開く'}
              glass={glass}
              active={dockOpen}
            >
              <IconFolder size={13} />
            </TactileButton>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── State C: Handy Dock ── */}
      <AnimatePresence>
        {dockOpen && <HandyDock snapSide={snapSide} onFlash={specular.flash} />}
      </AnimatePresence>
    </div>
  )
}
