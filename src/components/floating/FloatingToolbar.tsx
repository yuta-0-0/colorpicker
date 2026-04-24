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
  IconPlus,
} from '@/components/ui/Icons'

// ── 定数 ────────────────────────────────────────────────────────
// Toolbar の高さ（FloatingTab.tsx の TOOLBAR_H と同値を保つこと）
const TOOLBAR_H = 380

// Iris morph 定数
// Toolbar 内 LiquidDot 中心座標（%）
// padding-top:12 + shrinkBtn:26 + gap:8 + dot:24/2 = 58px / 380px ≈ 15%
const DOT_POS    = '50% 15%'
const CLIP_OPEN  = `circle(150% at ${DOT_POS})`
const CLIP_CLOSE = `circle(0% at ${DOT_POS})`

// B→A: iris アニメーション完了後ウィンドウを trim するまでの猶予 (ms)
const TRIM_DELAY = 680
// Dock close: HandyDock exit 完了後にウィンドウを縮小するまでの猶予 (ms)
const DOCK_CLOSE_DELAY = 220

// ボタンタップ用スプリング
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

// ── 円形タクティルボタン（Step 2: 完全な円形） ──────────────────
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
      whileTap={{ scale: 0.92 }}
      transition={SPRING_TAP}
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        borderRadius: '50%',   // 完全な円形
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        padding: 0,
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
    miniSlots, setMiniSlot, pushMiniSlot,
    swapColors, setFloatingState,
  } = useFloatingStore()

  const [copied, setCopied]     = useState(false)
  const [dockOpen, setDockOpen] = useState(false)
  const copyTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slotTimers    = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const trimTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const specular = useSpecularReflection()

  // ── エントリ閃光（iris が開ききる頃に光を当てる） ─────────────
  useEffect(() => {
    const t = setTimeout(() => specular.flash(), 200)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── コピー ──────────────────────────────────────────────────
  const handleCopyHex = useCallback(() => {
    copyToClipboard(currentColor.hex)
    setCopied(true)
    specular.flash()  // Step 5: コピー成功 → 境界光フラッシュ
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
  }, [currentColor.hex, specular])

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

  // ── Step 4: プッシュスロット（現在色を先頭に挿入、末尾を押し出す） ──
  const handlePushSlot = useCallback(() => {
    pushMiniSlot(currentColor.hex)
  }, [currentColor.hex, pushMiniSlot])

  // ── 縮小（B → A）────────────────────────────────────────────
  const handleShrink = useCallback(() => {
    const anchor = snapSide === 'right' ? 'right' : 'left'
    // Step 1: 幅を 48→80 に先行拡張（Tab が iris-open できる空間を確保）
    window.electronAPI?.requestFloatingResize({ width: 80, height: TOOLBAR_H, anchor })
    // Step 2: 状態変化（Toolbar iris-close exit / Tab iris-open enter が始まる）
    setFloatingState('tab')
    // Step 3: iris アニメーション完了後、Tab サイズ 80×32 に trim
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
      slotTimers.current.forEach(t => clearTimeout(t))
    }
  }, [])

  // ── Dock 開閉 → ウィンドウ幅リサイズ ─────────────────────────
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
        gap: 0,
        height: TOOLBAR_H,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {/* ── Toolbar 本体（48px 幅、完全ピル形）── */}
      <motion.div
        // ── Iris Morph（Step 1）──
        initial={{ clipPath: CLIP_CLOSE }}
        animate={{ clipPath: CLIP_OPEN  }}
        exit={{
          clipPath: CLIP_CLOSE,
          transition: {
            clipPath: { type: 'spring', stiffness: 480, damping: 40, mass: 0.4 },
          },
        }}
        transition={{
          clipPath: { delay: 0.06, type: 'spring', stiffness: 200, damping: 22, mass: 0.8 },
        }}
        onMouseMove={specular.handleMouseMove}
        onMouseLeave={specular.handleMouseLeave}
        style={{
          position: 'relative',
          width: 48,
          height: TOOLBAR_H,
          borderRadius: 24,        // Step 2: 完全ピル形（= 幅 48px / 2）
          background: 'rgba(18, 24, 38, 0.70)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          // border: none — SpecularBorder が 1.4px chamfer を担う（Step 3）
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.14), inset 0 0 14px rgba(255,255,255,0.04)',
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
        <SpecularBorder
          borderRadius={24}
          background={specular.background}
          opacity={specular.opacity}
        />

        {/* ── 0. 縮小ボタン（円形）── */}
        <motion.button
          onClick={handleShrink}
          whileTap={{ scale: 0.92 }}
          transition={SPRING_TAP}
          title="カプセルに戻す"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '50%',
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.40)',
            padding: 0,
            WebkitAppRegion: 'no-drag',
            position: 'relative',
            zIndex: 1,
            flexShrink: 0,
          } as React.CSSProperties}
        >
          <IconMinus size={13} />
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
            flexShrink: 0,
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
            whileTap={{ scale: 0.92 }}
            transition={SPRING_TAP}
            title="色を入れ替え"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '50%',
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
              padding: 0,
              marginTop: previousColor ? 10 : 0,
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
          >
            <IconArrowsLeftRight size={13} />
          </motion.button>
        </div>

        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)', position: 'relative', zIndex: 1, flexShrink: 0 }} />

        {/* ── 2. クイックアクション ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          WebkitAppRegion: 'no-drag', position: 'relative', zIndex: 1, flexShrink: 0,
        } as React.CSSProperties}>
          <TactileButton onClick={handleScreenPicker} title="スポイト">
            <IconEyedropper size={13} />
          </TactileButton>
          <TactileButton onClick={handleCopyHex} title="HEXをコピー">
            {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
          </TactileButton>
        </div>

        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)', position: 'relative', zIndex: 1, flexShrink: 0 }} />

        {/* ── 3. ミニスロット ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          alignItems: 'center', WebkitAppRegion: 'no-drag', position: 'relative', zIndex: 1, flexShrink: 0,
        } as React.CSSProperties}>
          {miniSlots.map((hex, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.90 }}
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
                width: 22, height: 22, borderRadius: '50%',
                background: hex ?? 'rgba(255,255,255,0.06)',
                border: hex
                  ? '0.5px solid rgba(255,255,255,0.20)'
                  : '0.5px dashed rgba(255,255,255,0.20)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.35)', fontSize: 9,
                WebkitAppRegion: 'no-drag',
                padding: 0,
              } as React.CSSProperties}
            >
              {!hex && '+'}
            </motion.button>
          ))}

          {/* ── Step 4: プッシュボタン（現在色を先頭挿入 / 末尾を押し出す）── */}
          <motion.button
            whileTap={{ scale: 0.90 }}
            transition={SPRING_TAP}
            onClick={handlePushSlot}
            title="現在の色をスロットに追加（古い色は押し出される）"
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(80,176,211,0.12)',
              border: '0.5px solid rgba(80,176,211,0.30)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(80,176,211,0.80)',
              WebkitAppRegion: 'no-drag',
              padding: 0,
            } as React.CSSProperties}
          >
            <IconPlus size={10} />
          </motion.button>
        </div>

        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)', marginTop: 'auto', position: 'relative', zIndex: 1, flexShrink: 0 }} />

        {/* ── 4. Dock 展開ボタン ── */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <TactileButton onClick={() => setDockOpen(v => !v)} title={dockOpen ? 'Dockを閉じる' : 'Dockを開く'}>
            <IconFolder size={13} />
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
