// src/components/floating/FloatingToolbar.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'
import { HandyDock } from './HandyDock'
import { SpecularBorder, useSpecularReflection } from './SpecularBorder'
import {
  IconArrowsLeftRight,
  IconEyedropper,
  IconCopy,
  IconCheck,
  IconFolder,
  IconMinus,
} from '@/components/ui/Icons'

// メインウィンドウのパネル・リストと同一スプリング（「吸い付くような」質感）
const SPRING = { type: 'spring', stiffness: 500, damping: 40, mass: 0.5 } as const
// ボタンタップ: 即座のフィードバック用（短い）
const SPRING_TAP = { type: 'spring', stiffness: 300, damping: 30 } as const

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

function TactileButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title?: string
  children: React.ReactNode
}) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileTap={{ scale: 0.95 }}
      transition={SPRING_TAP}
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        borderRadius: 8,
        width: 34,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {children}
    </motion.button>
  )
}

export function FloatingToolbar() {
  const {
    currentColor, previousColor, snapSide,
    miniSlots, setMiniSlot, swapColors, setFloatingState,
  } = useFloatingStore()

  const [copied, setCopied]     = useState(false)
  const [dockOpen, setDockOpen] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // long-press: スロット上書きタイマー（スロット番号 → タイマーID）
  const slotTimers   = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const specular = useSpecularReflection()

  // ── コピー ──────────────────────────────────────────────────
  const handleCopyHex = useCallback(() => {
    copyToClipboard(currentColor.hex)
    setCopied(true)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
  }, [currentColor.hex])

  // ── スポイト ─────────────────────────────────────────────────
  const handleScreenPicker = useCallback(() => {
    window.electronAPI?.startScreenPicker()
  }, [])

  // ── スロット操作 ─────────────────────────────────────────────
  const handleRegisterSlot = useCallback((index: number) => {
    setMiniSlot(index, currentColor.hex)
  }, [currentColor.hex, setMiniSlot])

  const handleSlotSelect = useCallback((hex: string | null) => {
    if (!hex) return
    window.electronAPI?.floatingColorSelected(hex)
  }, [])

  /**
   * long press 450ms → 現在色で上書き（4枠全て埋まっていても可）
   * short click → 適用 or 登録（従来動作）
   */
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
    if (hex) {
      handleSlotSelect(hex)
    } else {
      handleRegisterSlot(i)
    }
  }, [handleSlotSelect, handleRegisterSlot])

  const handleSlotPointerLeave = useCallback((i: number) => {
    const timer = slotTimers.current.get(i)
    if (timer) { clearTimeout(timer); slotTimers.current.delete(i) }
  }, [])

  // ── 縮小（Toolbar → Tab） ────────────────────────────────────
  const handleShrink = useCallback(() => {
    setFloatingState('tab')
    window.electronAPI?.requestFloatingResize({ width: 80, height: 32, anchor: 'center' })
  }, [setFloatingState])

  // ── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      slotTimers.current.forEach(t => clearTimeout(t))
    }
  }, [])

  // ── Dock 開閉 → ウィンドウ幅リサイズ ─────────────────────────
  useEffect(() => {
    const anchor = snapSide === 'right' ? 'right' : 'left'
    window.electronAPI?.requestFloatingResize({
      width: dockOpen ? 372 : 48,
      height: 320,
      anchor,
    })
  }, [dockOpen, snapSide])

  // snapSide !== 'right' → Toolbar を左側に固定して Dock を右展開
  const isDockLeft = snapSide !== 'right'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isDockLeft ? 'row' : 'row-reverse',
        alignItems: 'flex-start',
        gap: 0,
        height: 320,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {/* ── Toolbar 本体（48px） ── */}
      <motion.div
        layoutId="floating-frame"
        layout
        // マウント時: ホワイトボーダーが瞬く（ガラス出現演出）
        initial={{ opacity: 0, borderColor: 'rgba(255,255,255,0.38)' }}
        animate={{ opacity: 1, borderColor: 'rgba(255,255,255,0.12)' }}
        exit={{ opacity: 0 }}
        transition={{
          default:     SPRING,
          borderColor: { duration: 0.9, ease: 'easeOut' },
          opacity:     { duration: 0.18 },
        }}
        onMouseMove={specular.handleMouseMove}
        onMouseLeave={specular.handleMouseLeave}
        style={{
          position: 'relative',     // SpecularBorder の absolute 基準
          width: 48,
          height: 320,
          borderRadius: 16,
          background: 'rgba(18, 24, 38, 0.70)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderWidth: '0.5px',
          borderStyle: 'solid',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 0',
          gap: 8,
          WebkitAppRegion: 'drag',
          flexShrink: 0,
          overflow: 'hidden',
        } as React.CSSProperties}
      >
        {/* 鏡面反射（マウス追従） */}
        <SpecularBorder
          borderRadius={16}
          background={specular.background}
          opacity={specular.opacity}
        />

        {/* ── 0. 縮小ボタン ── */}
        <motion.button
          onClick={handleShrink}
          whileTap={{ scale: 0.95 }}
          transition={SPRING_TAP}
          title="カプセルに戻す"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.40)',
            cursor: 'pointer',
            padding: 0,
            WebkitAppRegion: 'no-drag',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          } as React.CSSProperties}
        >
          <IconMinus size={14} />
        </motion.button>

        {/* ── 1. スワップ領域 ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            WebkitAppRegion: 'no-drag',
            position: 'relative',
            zIndex: 1,
          } as React.CSSProperties}
        >
          <LiquidDot hex={currentColor.hex} size={24} />
          {previousColor && (
            <div style={{ position: 'relative', width: 24, height: 0 }}>
              <div style={{ position: 'absolute', top: -8, left: 6 }}>
                <LiquidDot hex={previousColor.hex} size={16} />
              </div>
            </div>
          )}
          <motion.button
            onClick={swapColors}
            whileTap={{ scale: 0.95 }}
            transition={SPRING_TAP}
            title="色を入れ替え"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: 0,
              marginTop: previousColor ? 10 : 0,
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
          >
            <IconArrowsLeftRight size={14} />
          </motion.button>
        </div>

        {/* 仕切り */}
        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)', position: 'relative', zIndex: 1 }} />

        {/* ── 2. クイックアクション ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, WebkitAppRegion: 'no-drag', position: 'relative', zIndex: 1 } as React.CSSProperties}>
          <TactileButton onClick={handleScreenPicker} title="スポイト">
            <IconEyedropper size={14} />
          </TactileButton>
          <TactileButton onClick={handleCopyHex} title="HEXをコピー">
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          </TactileButton>
        </div>

        {/* 仕切り */}
        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)', position: 'relative', zIndex: 1 }} />

        {/* ── 3. ミニスロット ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', WebkitAppRegion: 'no-drag', position: 'relative', zIndex: 1 } as React.CSSProperties}>
          {miniSlots.map((hex, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.93 }}
              transition={SPRING_TAP}
              onPointerDown={() => handleSlotPointerDown(i)}
              onPointerUp={() => handleSlotPointerUp(i, hex)}
              onPointerLeave={() => handleSlotPointerLeave(i)}
              onContextMenu={(e) => { e.preventDefault(); setMiniSlot(i, null) }}
              title={hex
                ? `${hex}（クリック:適用 / 長押し:上書き / 右クリック:解除）`
                : '現在色を登録（長押しで上書き）'
              }
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: hex ?? 'rgba(255,255,255,0.06)',
                border: hex
                  ? '0.5px solid rgba(255,255,255,0.20)'
                  : '0.5px dashed rgba(255,255,255,0.20)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.35)',
                fontSize: 9,
                WebkitAppRegion: 'no-drag',
              } as React.CSSProperties}
            >
              {!hex && '+'}
            </motion.button>
          ))}
        </div>

        {/* 仕切り */}
        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)', marginTop: 'auto', position: 'relative', zIndex: 1 }} />

        {/* ── 4. Dock 展開ボタン ── */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <TactileButton
            onClick={() => setDockOpen(v => !v)}
            title={dockOpen ? 'Dockを閉じる' : 'Dockを開く'}
          >
            <IconFolder size={14} />
          </TactileButton>
        </div>
      </motion.div>

      {/* ── Handy Dock（State C） ── */}
      <AnimatePresence>
        {dockOpen && <HandyDock snapSide={snapSide} />}
      </AnimatePresence>
    </div>
  )
}
