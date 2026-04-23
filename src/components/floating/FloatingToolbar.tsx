// src/components/floating/FloatingToolbar.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'
import { HandyDock } from './HandyDock'
import { IconArrowsLeftRight, IconEyedropper, IconCopy, IconCheck, IconFolder, IconArrowLineUp } from '@/components/ui/Icons'

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
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
  const [copied, setCopied] = useState(false)
  const [dockOpen, setDockOpen] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopyHex = useCallback(() => {
    copyToClipboard(currentColor.hex)
    setCopied(true)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
  }, [currentColor.hex])

  const handleScreenPicker = useCallback(() => {
    window.electronAPI?.startScreenPicker()
  }, [])

  const handleRegisterSlot = useCallback((index: number) => {
    setMiniSlot(index, currentColor.hex)
  }, [currentColor.hex, setMiniSlot])

  const handleSlotSelect = useCallback((hex: string | null) => {
    if (!hex) return
    window.electronAPI?.floatingColorSelected(hex)
  }, [])

  const handleShrink = useCallback(() => {
    setFloatingState('tab')
    window.electronAPI?.requestFloatingResize({ width: 80, height: 32, anchor: 'center' })
  }, [setFloatingState])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  // Dock 開閉に合わせてウィンドウ幅をリサイズ
  // Toolbar 48px + margin 4px + HandyDock 320px = 372px
  useEffect(() => {
    window.electronAPI?.requestFloatingResize({
      width: dockOpen ? 372 : 48,
      height: 320,
      anchor: dockOpen
        ? (snapSide === 'right' ? 'right' : 'left')
        : (snapSide === 'right' ? 'right' : 'left'),
    })
  }, [dockOpen, snapSide])

  const isDockLeft = snapSide === 'left'

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
        initial={{ borderColor: 'rgba(80,176,211,0.5)' }}
        animate={{ borderColor: 'rgba(255,255,255,0.15)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          width: 48,
          height: 320,
          borderRadius: 16,
          background: 'rgba(18, 24, 38, 0.70)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '0.5px solid',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 0',
          gap: 8,
          WebkitAppRegion: 'drag',
          flexShrink: 0,
        } as React.CSSProperties}
      >
        {/* ── 0. 縮小ボタン ── */}
        <motion.button
          onClick={handleShrink}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          title="カプセルに戻す"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            fontSize: 12,
            padding: 0,
            WebkitAppRegion: 'no-drag',
            display: 'flex',
            alignItems: 'center',
          } as React.CSSProperties}
        >
          <IconArrowLineUp size={13} />
        </motion.button>

        {/* ── 1. スワップ領域（イラレ風） ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          {/* アクティブ色（大） */}
          <LiquidDot hex={currentColor.hex} size={24} />
          {/* サブ色（小・右下にオフセット） */}
          {previousColor && (
            <div style={{ position: 'relative', width: 24, height: 0 }}>
              <div style={{ position: 'absolute', top: -8, left: 6 }}>
                <LiquidDot hex={previousColor.hex} size={16} />
              </div>
            </div>
          )}
          {/* スワップボタン */}
          <motion.button
            onClick={swapColors}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            title="色を入れ替え"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
              marginTop: previousColor ? 10 : 0,
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
          >
            <IconArrowsLeftRight size={14} />
          </motion.button>
        </div>

        {/* 仕切り */}
        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)' }} />

        {/* ── 2. クイックアクション ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <TactileButton onClick={handleScreenPicker} title="スポイト">
            <IconEyedropper size={14} />
          </TactileButton>
          <TactileButton onClick={handleCopyHex} title="HEXをコピー">
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          </TactileButton>
        </div>

        {/* 仕切り */}
        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)' }} />

        {/* ── 3. ミニスロット（4色） ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {miniSlots.map((hex, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={() => hex ? handleSlotSelect(hex) : handleRegisterSlot(i)}
              onContextMenu={() => setMiniSlot(i, null)}
              title={hex ? `${hex}（右クリックで解除）` : '現在色を登録'}
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
        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)', marginTop: 'auto' }} />

        {/* ── 4. Dock 展開ボタン ── */}
        <TactileButton
          onClick={() => setDockOpen(v => !v)}
          title={dockOpen ? 'Dockを閉じる' : 'Dockを開く'}
        >
          <IconFolder size={14} />
        </TactileButton>
      </motion.div>

      {/* ── Handy Dock（State C、Toolbarから横に展開） ── */}
      <AnimatePresence>
        {dockOpen && <HandyDock snapSide={snapSide} />}
      </AnimatePresence>
    </div>
  )
}
