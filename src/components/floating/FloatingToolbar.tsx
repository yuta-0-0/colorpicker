// src/components/floating/FloatingToolbar.tsx
//
// ── 物理骨格: Width 48px / Height 画面高（吸着スラブ）────────────────────
//   背景: rgba(6,9,16,0.55) / 影なし / 画面接地辺に SpecularBorder
//   逆側: round 12px / DNA レイアウト: x=24 中心軸の縦構成
//
// ── A→B enter clip-path タイムライン（300ms）──────────────────────────
//   TB_DOT_ORIGIN（HeroDot 半径 12px）→ TB_OPEN（circle 150%）
//
// ── B→A exit clip-path タイムライン（550ms）────────────────────────────
//   TB_OPEN → TB_DOT_ORIGIN（ドット位置へ一気に吸い込まれる）

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { Easing } from 'motion-utils'
import { useFloatingStore } from '@/store/floatingStore'
import { HandyDock } from './HandyDock'
import { SpecularBorder, ColorBleed, useSpecularReflection } from './SpecularBorder'
import { usePrefersDark, getGlassTokens } from './useTheme'
import {
  IconEyedropper,
  IconCheck,
  IconFolder,
} from '@/components/ui/Icons'

// ── 画面高（モジュール定数: 起動時一度だけ読む）──────────────────────
const SCREEN_H = typeof window !== 'undefined' ? window.screen.availHeight : 800

// ── clip-path 定数（動的計算: SCREEN_H 依存）──────────────────────────
// HeroDot 中心: left=12 + 24/2 = 24px → 50%, top=46 + 24/2 = 58px
const _dotPctY    = ((58 / SCREEN_H) * 100).toFixed(2)
const TB_DOT_POS  = `50% ${_dotPctY}%`
const TB_OPEN     = `circle(150% at ${TB_DOT_POS})`
// TB_DOT_ORIGIN: HeroDot 半径 12px の固定長（参照長に依らず正確）
const TB_DOT_ORIGIN = `circle(12px at ${TB_DOT_POS})`

// ── タイミング（変更禁止）──────────────────────────────────────────────
const AB_ENTER_DELAY   = 0.914
const AB_ENTER_DUR     = 0.36
const BA_EXIT_DUR        = 0.55
const BA_BUTTON_EXIT_DUR = 0.22
const BA_BG_EXIT_DELAY   = 0.00
const TRIM_DELAY_BA      = 1700
const DOCK_CLOSE_DELAY = 220

// ── イージング（変更禁止）─────────────────────────────────────────────
const EASE_QUINT: Easing = [0.8, 0, 0.6, 1] as Easing
const ENTER_DUR        = 0.30

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

// ── FloatingToolbar ─────────────────────────────────────────────────
export function FloatingToolbar() {
  const {
    currentColor, snapSide,
    miniSlots, setMiniSlot, promoteSlot,
    setFloatingState, setPendingSaveAfterPick, setBToMainPending,
  } = useFloatingStore()

  const [copied, setCopied]               = useState(false)
  const [dockOpen, setDockOpen]           = useState(false)
  const [eyeLongActive, setEyeLongActive] = useState(false)
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

  // ── コピー（flash）──────────────────────────────────────────
  const handleCopyHex = useCallback(() => {
    copyToClipboard(currentColor.hex)
    setCopied(true)
    specular.flash()
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
  }, [currentColor.hex, specular])

  // ── ドットダブルクリック: B → Main ───────────────────────────
  const handleDotDoubleClick = useCallback(() => {
    setDockOpen(false)
    const anchor = snapSide === 'right' ? 'right' : 'left'
    window.electronAPI?.requestFloatingResize({ width: 80, height: SCREEN_H, anchor })
    delayTimerRef.current = setTimeout(() => {
      setBToMainPending(true)
      setFloatingState('tab')
    }, 60)
  }, [setFloatingState, snapSide, setBToMainPending])

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
      setEjectingIndex(i)
    } else {
      window.electronAPI?.floatingSaveColor?.({
        hex: currentColor.hex,
        alpha: currentColor.alpha,
        name: currentColor.name ?? currentColor.hex,
      })
      window.electronAPI?.floatingColorSelected(currentColor.hex)
      specular.flash()
      setMiniSlot(i, currentColor.hex)
    }
  }, [currentColor, specular, setMiniSlot])

  const handleSlotPointerLeave = useCallback((i: number) => {
    const t = slotTimers.current.get(i)
    if (t) { clearTimeout(t); slotTimers.current.delete(i) }
  }, [])

  // ── 縮小（B → A）──────────────────────────────────────────────
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

  // ── 角丸: 画面接地辺は直角、逆側は round 12px ─────────────────
  const toolbarRadius = snapSide === 'right' ? '12px 0 0 12px' : '0 12px 12px 0'
  // SpecularBorder は画面接地辺（right snap → 右辺、left snap → 左辺）
  const specularSide = snapSide === 'right' ? 'right' as const : 'left' as const

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
          opacity: {
            delay:    AB_ENTER_DELAY,
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
          height: SCREEN_H,
          borderRadius: toolbarRadius,
          background: 'rgba(6, 9, 16, 0.55)',
          backdropFilter: 'blur(24px) saturate(185%)',
          WebkitBackdropFilter: 'blur(24px) saturate(185%)',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          WebkitAppRegion: 'drag',
          flexShrink: 0,
          overflow: 'hidden',
        } as React.CSSProperties}
      >
        {/* 内部カラーにじみ */}
        <ColorBleed
          borderRadius={toolbarRadius}
          innerGlow={specular.innerGlow}
          innerGlowOpacity={specular.innerGlowOpacity}
        />
        {/* 画面接地辺のみ 1.4px 鏡面反射 */}
        <SpecularBorder
          borderRadius={toolbarRadius}
          background={specular.background}
          opacity={specular.opacity}
          side={specularSide}
        />

        {/* ── 縮小ハンドル（B → A, 最上部）── */}
        <motion.button
          onClick={handleShrink}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT } }}
          transition={{ delay: AB_ENTER_DELAY + 0.00, duration: ENTER_DUR, ease: EASE_QUINT }}
          whileTap={{ scaleX: 0.85 }}
          title="カプセルに戻す"
          style={{
            width: 20, height: 3, borderRadius: 2,
            background: 'rgba(255,255,255,0.14)',
            border: 'none', cursor: 'pointer',
            WebkitAppRegion: 'no-drag',
            position: 'relative', zIndex: 1, flexShrink: 0,
            padding: 0,
            marginBottom: 9,
          } as React.CSSProperties}
        />

        {/* ── HeroDot スペーサー（FloatingSystemView の HeroDot が視覚を担当）── */}
        <div
          onDoubleClick={handleDotDoubleClick}
          style={{
            width: 24, height: 24, flexShrink: 0,
            position: 'relative', zIndex: 1,
            cursor: 'pointer', WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        />

        {/* ── Action Group: Eyedropper + HEX text ── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0, transition: {
            y:       { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
            opacity: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
          }}}
          transition={{
            y:       { delay: AB_ENTER_DELAY + 0.04, duration: ENTER_DUR, ease: EASE_QUINT },
            opacity: { delay: AB_ENTER_DELAY + 0.04, duration: ENTER_DUR, ease: EASE_QUINT },
          }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 5, marginTop: 10,
            position: 'relative', zIndex: 1, flexShrink: 0,
          } as React.CSSProperties}
        >
          {/* Eyedropper ボタン */}
          <motion.button
            onPointerDown={handleEyePointerDown}
            onPointerUp={handleEyePointerUp}
            onPointerLeave={handleEyePointerLeave}
            title="スポイト（長押し：取得後に自動保存）"
            whileTap={{ scale: 0.90 }}
            style={{
              background: eyeLongActive ? glass.accentBg : 'rgba(255,255,255,0.07)',
              border: `0.5px solid ${eyeLongActive ? glass.accentBorder : 'rgba(255,255,255,0.10)'}`,
              borderRadius: '50%',
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: eyeLongActive ? glass.accentColor : glass.textMuted,
              padding: 0,
              WebkitAppRegion: 'no-drag',
              flexShrink: 0,
            } as React.CSSProperties}
          >
            <IconEyedropper size={13} />
          </motion.button>

          {/* HEX テキスト（クリックでコピー）*/}
          <motion.button
            onClick={handleCopyHex}
            title="HEXをコピー"
            whileTap={{ scale: 0.94 }}
            style={{
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', WebkitAppRegion: 'no-drag',
              fontFamily: 'monospace',
              fontSize: 8,
              letterSpacing: '0.03em',
              color: copied ? glass.accentColor : 'rgba(255,255,255,0.45)',
              lineHeight: 1,
              flexShrink: 0,
            } as React.CSSProperties}
          >
            {copied
              ? <IconCheck size={9} />
              : currentColor.hex.replace('#', '').toUpperCase()
            }
          </motion.button>
        </motion.div>

        {/* ── Separator ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT } }}
          transition={{ delay: AB_ENTER_DELAY + 0.06, duration: ENTER_DUR, ease: EASE_QUINT }}
          style={{
            width: 28, height: 0.5,
            background: 'rgba(255,255,255,0.10)',
            position: 'relative', zIndex: 1, flexShrink: 0,
            marginTop: 7, marginBottom: 7,
          } as React.CSSProperties}
        />

        {/* ── Mini Slots × 4（14px 丸角、7px gap）── */}
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            position: 'relative', zIndex: 1, flexShrink: 0,
          } as React.CSSProperties}
        >
          {miniSlots.map((hex, i) => {
            const isEjecting = ejectingIndex === i
            return (
              <motion.button
                key={`${i}-${hex ?? 'empty'}`}
                layoutId={`slot-${i}`}
                initial={{ y: 16, scale: 0.6, opacity: 0 }}
                animate={isEjecting
                  ? { y: -20, scale: 0.2, opacity: 0 }
                  : { y: 0, scale: 1, opacity: 1 }
                }
                exit={{ y: -16, scale: 0.7, opacity: 0, transition: {
                  y:       { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
                  scale:   { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
                  opacity: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT },
                }}}
                onAnimationComplete={() => {
                  if (isEjecting && hex) {
                    promoteSlot(hex)
                    window.electronAPI?.floatingColorSelected(hex)
                    setEjectingIndex(null)
                  }
                }}
                whileHover={isEjecting ? {} : { opacity: 0.75 }}
                whileTap={isEjecting ? {} : { scale: 0.85 }}
                transition={isEjecting
                  ? {
                      y:       { duration: 0.22, ease: EASE_QUINT },
                      scale:   { duration: 0.22, ease: EASE_QUINT },
                      opacity: { duration: 0.18, ease: EASE_QUINT },
                    }
                  : {
                      y:       { delay: AB_ENTER_DELAY + 0.08 + i * 0.02, duration: ENTER_DUR, ease: EASE_QUINT },
                      scale:   { delay: AB_ENTER_DELAY + 0.08 + i * 0.02, duration: ENTER_DUR, ease: EASE_QUINT },
                      opacity: { delay: AB_ENTER_DELAY + 0.08 + i * 0.02, duration: ENTER_DUR, ease: EASE_QUINT },
                    }
                }
                onPointerDown={() => !isEjecting && handleSlotPointerDown(i)}
                onPointerUp={() => !isEjecting && handleSlotPointerUp(i, hex)}
                onPointerLeave={() => handleSlotPointerLeave(i)}
                onContextMenu={(e) => { e.preventDefault(); setMiniSlot(i, null) }}
                title={hex
                  ? `${hex}（クリック:Active昇格 / 長押し:上書き / 右クリック:解除）`
                  : '（長押し:現在色を登録）'}
                style={{
                  width: 14, height: 14,
                  borderRadius: 4,
                  background: hex ?? 'rgba(255,255,255,0.06)',
                  border: hex ? 'none' : `0.5px solid rgba(255,255,255,0.12)`,
                  cursor: isEjecting ? 'default' : 'pointer',
                  flexShrink: 0, position: 'relative', zIndex: 1,
                  WebkitAppRegion: 'no-drag', padding: 0, display: 'block',
                } as React.CSSProperties}
              />
            )
          })}
        </div>

        {/* ── Dock 展開ボタン（絶対配置・最下部）── */}
        <motion.button
          onClick={() => setDockOpen(v => !v)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: BA_BUTTON_EXIT_DUR, ease: EASE_QUINT } }}
          transition={{ delay: AB_ENTER_DELAY + 0.16, duration: ENTER_DUR, ease: EASE_QUINT }}
          title={dockOpen ? 'Dockを閉じる' : 'Dockを開く'}
          whileTap={{ scale: 0.90 }}
          style={{
            position: 'absolute', bottom: 12,
            background: dockOpen ? glass.accentBg : 'rgba(255,255,255,0.07)',
            border: `0.5px solid ${dockOpen ? glass.accentBorder : 'rgba(255,255,255,0.10)'}`,
            borderRadius: '50%',
            width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: dockOpen ? glass.accentColor : glass.textMuted,
            padding: 0,
            WebkitAppRegion: 'no-drag',
            zIndex: 1,
          } as React.CSSProperties}
        >
          <IconFolder size={13} />
        </motion.button>
      </motion.div>

      {/* ── State C: Handy Dock ── */}
      <AnimatePresence>
        {dockOpen && <HandyDock snapSide={snapSide} onFlash={specular.flash} />}
      </AnimatePresence>
    </div>
  )
}
