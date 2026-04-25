// src/components/floating/FloatingToolbar.tsx
//
// ── Iris Morph 多段式（B → A）──────────────────────────────────────
//   FloatingTab.tsx と対称的な多段停止キーフレームで逆再生を実現
//
// ── Step 2: 究極の地層レイアウト ────────────────────────────────────
//   1段目: 縮小ボタン
//   2段目: LiquidDot（メイン）+ previousColor サブカラー（並置）
//   ▼ Noren（BookmarkSimple 展開、Step 4）
//   3〜6段目: 硝子孔スロット（透明＋1.4px chamfer）
//   7段目: ＋ボタン（充填トリガー）
//   8段目: Dark/Light 切替
//   9段目: フォルダ（HandyDock）
//   底部溜まり
//
// ── Step 3: プロの動線 ───────────────────────────────────────────────
//   スロット昇格: promoteSlot(hex) → floatingColorSelected(hex)
//   重複排除: pushMiniSlot 側で排除済み
//   ダブルクリック: floatingSaveColor → floatingColorSelected → flash
//
// ── Step 4: Noren ────────────────────────────────────────────────────
//   BookmarkSimple ボタンで height 0→auto スライド展開
//   Enter / 保存ボタンで確定 → flash → State B へ戻る
//   クイック保存: 空スロット短押し → 即保存
//
// ── Step 7: Save Flash ───────────────────────────────────────────────
//   保存成功時に specular.flash()

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
  IconSun,
  IconMoon,
  IconBookmarkSimple,
} from '@/components/ui/Icons'

// ── 定数 ────────────────────────────────────────────────────────────
const TOOLBAR_H = 480   // 420 → 480 (サブカラー + 8段目追加分)

// clip-path 定数（Toolbar 空間、48 × 480px）
// LiquidDot の中心 = top-padding 12 + shrink26/2 + gap8 + dot24/2 = 12+13+8+12 ≈ 9.4% ≈ 10%
const TB_DOT_POS = '50% 10%'

const TB_OPEN   = `circle(150% at ${TB_DOT_POS})`
const TB_P1_DOT = `circle(3.5% at ${TB_DOT_POS})`   // LiquidDot サイズ
const TB_P2_OVER= `circle(4.5% at ${TB_DOT_POS})`   // 一回り大きく
const TB_P3_SM  = `circle(2.5% at ${TB_DOT_POS})`   // 少し小さく（Tab へのハンドオフ）

// タイミング（FloatingTab.tsx の TOOLBAR_DELAY=0.68s に同期）
const TAB_DELAY      = 0.68
const EXIT_DURATION  = 0.92
const TRIM_DELAY_BA  = 1500
const DOCK_CLOSE_DELAY = 220

// B→A exit キーフレーム
const EXIT_FRAMES: string[] = [
  TB_OPEN, TB_P1_DOT, TB_P1_DOT, TB_P2_OVER, TB_P2_OVER, TB_P3_SM, TB_P3_SM,
]
const EXIT_TIMES: number[] = [0, 0.28, 0.43, 0.54, 0.63, 0.76, 1.0]
const EXIT_EASES: Easing[] = ['easeIn', 'linear', 'easeInOut', 'linear', 'easeInOut', 'linear']

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
    currentColor, previousColor, snapSide,
    miniSlots, setMiniSlot, pushMiniSlot, promoteSlot,
    setFloatingState, setPendingSaveAfterPick,
  } = useFloatingStore()

  const [copied, setCopied]             = useState(false)
  const [dockOpen, setDockOpen]         = useState(false)
  const [eyeLongActive, setEyeLongActive] = useState(false)
  // Step 4: のれん
  const [norenOpen, setNorenOpen]       = useState(false)
  const [norenName, setNorenName]       = useState('')
  const norenInputRef = useRef<HTMLInputElement>(null)

  const copyTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slotTimers     = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const trimTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eyeTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDark   = usePrefersDark()
  const glass    = getGlassTokens(isDark)
  const specular = useSpecularReflection({ accentHex: currentColor.hex })

  // ── エントリ閃光 ──────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => specular.flash(), (TAB_DELAY + 0.4) * 1000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── テーマ切替（Step 2, 8段目）──────────────────────────────
  const handleToggleTheme = useCallback(() => {
    window.electronAPI?.setTheme(isDark ? 'light' : 'dark')
  }, [isDark])

  // ── コピー（Step 7: flash）──────────────────────────────────
  const handleCopyHex = useCallback(() => {
    copyToClipboard(currentColor.hex)
    setCopied(true)
    specular.flash()
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
  }, [currentColor.hex, specular])

  // ── ドットダブルクリック（Step 3: 履歴保存 + flash）──────────
  const handleDotDoubleClick = useCallback(() => {
    // メインウィンドウの履歴に保存
    window.electronAPI?.floatingSaveColor?.({
      hex: currentColor.hex,
      alpha: currentColor.alpha,
      name: currentColor.name ?? currentColor.hex,
    })
    window.electronAPI?.floatingColorSelected(currentColor.hex)
    specular.flash()
  }, [currentColor, specular])

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
      setMiniSlot(i, currentColor.hex)  // 長押し = 上書き登録
    }, 450))
  }, [currentColor.hex, setMiniSlot])

  const handleSlotPointerUp = useCallback((i: number, hex: string | null) => {
    const t = slotTimers.current.get(i); if (!t) return
    clearTimeout(t); slotTimers.current.delete(i)
    if (hex) {
      // Step 3: 塗りスロット短押し → Active に昇格
      promoteSlot(hex)
      window.electronAPI?.floatingColorSelected(hex)
    } else {
      // Step 4: 空スロット短押し → クイック保存 + スロット登録
      window.electronAPI?.floatingSaveColor?.({
        hex: currentColor.hex,
        alpha: currentColor.alpha,
        name: currentColor.name ?? currentColor.hex,
      })
      window.electronAPI?.floatingColorSelected(currentColor.hex)
      specular.flash()
      handleRegisterSlot(i)
    }
  }, [promoteSlot, currentColor, specular, handleRegisterSlot])

  const handleSlotPointerLeave = useCallback((i: number) => {
    const t = slotTimers.current.get(i)
    if (t) { clearTimeout(t); slotTimers.current.delete(i) }
  }, [])

  // ── ＋ボタン（充填トリガー）──────────────────────────────────
  const handlePushSlot = useCallback(() => {
    pushMiniSlot(currentColor.hex)
    specular.flash()
  }, [currentColor.hex, pushMiniSlot, specular])

  // ── Step 4: のれん展開 ───────────────────────────────────────
  const handleOpenNoren = useCallback(() => {
    setNorenName(currentColor.name ?? currentColor.hex)
    setNorenOpen(true)
    setTimeout(() => norenInputRef.current?.focus(), 80)
  }, [currentColor])

  const handleCloseNoren = useCallback(() => {
    setNorenOpen(false)
    setNorenName('')
  }, [])

  const handleNorenSave = useCallback(() => {
    window.electronAPI?.floatingSaveColor?.({
      hex: currentColor.hex,
      alpha: currentColor.alpha,
      name: norenName || currentColor.hex,
    })
    window.electronAPI?.floatingColorSelected(currentColor.hex)
    specular.flash()
    handleCloseNoren()
  }, [currentColor, norenName, specular, handleCloseNoren])

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
        initial={{ clipPath: TB_P1_DOT }}
        animate={{ clipPath: TB_OPEN }}
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
        {/* 1.4px 鏡面反射シャモファー */}
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

        {/* ── 地層 2: LiquidDot（メイン）＋ サブカラー（並置）── */}
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
          <LiquidDot hex={currentColor.hex} size={24} layoutId="fs-active-dot" />
          {previousColor && (
            <LiquidDot
              hex={previousColor.hex}
              size={14}
              style={{ opacity: 0.55 }}
            />
          )}
        </div>

        {/* ── BookmarkSimple ボタン（のれんトリガー）── */}
        <TactileButton
          onClick={norenOpen ? handleCloseNoren : handleOpenNoren}
          title={norenOpen ? 'のれんを閉じる' : '詳細保存（名前付き）'}
          glass={glass}
          active={norenOpen}
        >
          <IconBookmarkSimple size={13} />
        </TactileButton>

        {/* ── Step 4: のれんパネル（height 0 → auto スライド）── */}
        <AnimatePresence>
          {norenOpen && (
            <motion.div
              key="noren"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.6 }}
              style={{
                overflow: 'hidden', width: '100%',
                flexShrink: 0, position: 'relative', zIndex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 6, padding: '6px 4px',
                  borderTop: `0.5px solid ${glass.divider}`,
                  borderBottom: `0.5px solid ${glass.divider}`,
                }}
              >
                <input
                  ref={norenInputRef}
                  value={norenName}
                  onChange={(e) => setNorenName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNorenSave() }}
                  placeholder="色の名前"
                  style={{
                    width: 36, background: glass.buttonBg,
                    border: `0.5px solid ${glass.buttonBorder}`,
                    borderRadius: 5, padding: '3px 5px',
                    fontSize: 9, color: glass.textPrimary,
                    outline: 'none', boxSizing: 'border-box',
                    textAlign: 'center',
                  } as React.CSSProperties}
                  onFocus={(e) => { e.currentTarget.style.borderColor = glass.accentBorder }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = glass.buttonBorder }}
                />
                <motion.button
                  onClick={handleNorenSave}
                  whileTap={{ scale: 0.90 }}
                  transition={SPRING_TAP}
                  style={{
                    background: glass.accentBg,
                    border: `0.5px solid ${glass.accentBorder}`,
                    borderRadius: 5, padding: '2px 8px',
                    fontSize: 9, color: glass.accentColor,
                    cursor: 'pointer', fontWeight: 500,
                  } as React.CSSProperties}
                >
                  保存
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div style={{ width: 28, height: 0.5, background: glass.divider, position: 'relative', zIndex: 1, flexShrink: 0 }} />

        {/* ── スポイト ── */}
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

        {/* ── 地層 3〜6: 硝子孔スロット（透明＋1.4px chamfer エッジ）── */}
        {miniSlots.map((hex, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.88 }}
            transition={SPRING_TAP}
            onPointerDown={() => handleSlotPointerDown(i)}
            onPointerUp={() => handleSlotPointerUp(i, hex)}
            onPointerLeave={() => handleSlotPointerLeave(i)}
            onContextMenu={(e) => { e.preventDefault(); setMiniSlot(i, null) }}
            title={hex
              ? `${hex}（クリック:Active昇格 / 長押し:上書き / 右クリック:解除）`
              : '（クリック:即保存 / ＋:現在色を登録）'}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              // 空: transparent 透明体、薄ボーダーのみ（硝子孔）
              // 塗: その色を表示
              background: hex ?? 'transparent',
              border: hex
                ? 'none'
                : `0.7px solid ${glass.textExtra}`,
              cursor: 'pointer',
              flexShrink: 0, position: 'relative', zIndex: 1,
              WebkitAppRegion: 'no-drag', padding: 0, display: 'block',
            } as React.CSSProperties}
          />
        ))}

        {/* ── 地層 7: ＋ボタン（充填トリガー）── */}
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

        {/* ── 底部の溜まり（ガラス曲面を見せる余白） ── */}
        <div style={{ flex: 1, minHeight: 12 }} />

        {/* ── 地層 8: Dark/Light 切替 ── */}
        <TactileButton
          onClick={handleToggleTheme}
          title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          glass={glass}
        >
          {isDark ? <IconSun size={13} /> : <IconMoon size={13} />}
        </TactileButton>

        {/* ── 地層 9: Dock 展開ボタン ── */}
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
