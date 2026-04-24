// src/components/floating/HandyDock.tsx
//
// Step 4: のれん展開（確定ボタン → 名前/タグ入力欄が height:0→auto でスライド）
// Step 6: handleApply で floatingStore の currentColor も更新
// Step 7: 保存成功時に親の flash() を呼ぶ

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useFloatingStore } from '@/store/floatingStore'
import { usePrefersDark, getGlassTokens } from './useTheme'
import type { SnapSide } from '@/types/floating'
import {
  IconCopy, IconCheck, IconArrowUpRight,
  IconClock, IconCaretDown, IconPlus, IconX,
} from '@/components/ui/Icons'

interface HandyDockProps {
  snapSide: SnapSide
  /** 保存成功時に Toolbar の SpecularBorder を flash させるコールバック */
  onFlash?: () => void
}

// ── 色行コンポーネント ────────────────────────────────────────
function ColorRow({
  hex,
  onCopy,
  onApply,
  onConfirm,
  glass,
}: {
  hex: string
  onCopy: () => void
  onApply: () => void
  onConfirm: () => void
  glass: ReturnType<typeof getGlassTokens>
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 1200)
    return () => clearTimeout(timer)
  }, [copied])

  const handleCopy = () => {
    onCopy()
    setCopied(true)
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px', borderRadius: 8, cursor: 'default',
        transition: 'background 80ms ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          `rgba(${glass === getGlassTokens(true) ? '255,255,255' : '10,20,40'},0.06)`
      }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: hex,
          border: `0.5px solid rgba(128,128,128,0.25)`,
          flexShrink: 0,
          cursor: 'pointer',
        }}
        onClick={onApply}
      />
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: glass.textPrimary, flex: 1 }}>
        {hex.toUpperCase()}
      </span>
      <button
        onClick={handleCopy}
        style={{
          background: 'none', border: 'none',
          color: copied ? glass.accentColor : glass.textExtra,
          cursor: 'pointer', padding: '2px 4px',
        }}
        title="コピー"
      >
        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
      </button>
      {/* Step 4: 矢印 = 確定ボタン（のれん展開） */}
      <button
        onClick={onConfirm}
        style={{
          background: 'none', border: 'none',
          color: glass.textExtra,
          cursor: 'pointer', padding: '2px 4px',
        }}
        title="名前をつけて保存"
      >
        <IconArrowUpRight size={12} />
      </button>
    </div>
  )
}

// ── HandyDock 本体 ────────────────────────────────────────────
export function HandyDock({ snapSide, onFlash }: HandyDockProps) {
  const {
    history, folders, activeFolderIndex, setActiveFolderIndex,
    currentColor, setCurrentColorFromPicker,
  } = useFloatingStore()

  const isDark = usePrefersDark()
  const glass  = getGlassTokens(isDark)

  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false)
  // Step 4: のれん状態
  const [norenOpen, setNorenOpen]       = useState(false)
  const [norenHex,  setNorenHex]        = useState('')
  const [norenName, setNorenName]       = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const isDockOnRight = snapSide !== 'right'
  const slideX = isDockOnRight ? -12 : 12

  const displayItems = activeFolderIndex === 0
    ? history.slice(0, 20)
    : (folders[activeFolderIndex - 1]?.colors ?? [])

  const activeFolder = activeFolderIndex > 0 ? folders[activeFolderIndex - 1] : null
  const folderLabel  = activeFolderIndex === 0 ? '履歴' : (activeFolder?.name ?? '')

  // ── Step 6: handleApply — floatingStore も更新 ────────────
  const handleApply = (hex: string) => {
    setCurrentColorFromPicker(hex)          // B の LiquidDot をリアルタイム更新
    window.electronAPI?.floatingColorSelected(hex)  // メインウィンドウへ
  }

  // ── Step 4: のれん展開 ──────────────────────────────────────
  const handleConfirm = (hex: string) => {
    setNorenHex(hex)
    setNorenName(hex)  // 初期名 = hex 値
    setNorenOpen(true)
    setTimeout(() => nameInputRef.current?.focus(), 80)
  }

  const handleNorenClose = () => {
    setNorenOpen(false)
    setNorenHex('')
    setNorenName('')
  }

  // ── Step 4: 保存確定 → メタデータ付きでメインへ送信 ─────────
  const handleSave = () => {
    if (!norenHex) return
    // floatingColorSelected（既存 IPC）と floatingSaveColor（新規）を両方送る
    window.electronAPI?.floatingSaveColor?.({ hex: norenHex, alpha: 1, name: norenName || norenHex })
    window.electronAPI?.floatingColorSelected(norenHex)
    onFlash?.()        // Step 7: 保存成功の鼓動フラッシュ
    handleNorenClose()
  }

  const handleSaveToFolder = () => {
    if (activeFolderIndex === 0) return
    window.electronAPI?.floatingSaveColor?.({
      hex: currentColor.hex,
      alpha: currentColor.alpha,
      name: currentColor.name,
    })
    window.electronAPI?.floatingColorSelected(currentColor.hex)
    onFlash?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: slideX }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: slideX }}
      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.5 }}
      style={{
        width: 320,
        height: 420,       // TOOLBAR_H に合わせる
        borderRadius: 16,
        background: glass.dockBg,
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: `0.5px solid ${glass.dockBorder}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: isDockOnRight ? '0 0 0 4px' : '0 4px 0 0',
        flexShrink: 0,
      } as React.CSSProperties}
    >
      {/* ── Step 4: のれん（名前入力パネル）── */}
      <AnimatePresence>
        {norenOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.6 }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <div
              style={{
                padding: '10px 12px',
                borderBottom: `0.5px solid ${glass.dockBorder}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* ヘッダー（色 + 閉じるボタン）*/}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: norenHex, flexShrink: 0,
                    border: `0.5px solid rgba(128,128,128,0.25)`,
                  }}
                />
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: glass.textPrimary, flex: 1 }}>
                  {norenHex.toUpperCase()}
                </span>
                <button
                  onClick={handleNorenClose}
                  style={{
                    background: 'none', border: 'none',
                    color: glass.textMuted, cursor: 'pointer', padding: 4,
                  }}
                >
                  <IconX size={12} />
                </button>
              </div>
              {/* 名前入力 */}
              <input
                ref={nameInputRef}
                value={norenName}
                onChange={(e) => setNorenName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                placeholder="色の名前"
                style={{
                  background: glass.buttonBg,
                  border: `0.5px solid ${glass.buttonBorder}`,
                  borderRadius: 6,
                  padding: '5px 8px',
                  fontSize: 11,
                  color: glass.textPrimary,
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = glass.accentBorder
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = glass.buttonBorder
                }}
              />
              {/* 保存ボタン */}
              <button
                onClick={handleSave}
                style={{
                  background: glass.accentBg,
                  border: `0.5px solid ${glass.accentBorder}`,
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: 11,
                  color: glass.accentColor,
                  cursor: 'pointer',
                  alignSelf: 'flex-end',
                  fontWeight: 500,
                }}
              >
                保存
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── リストエリア ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 2px',
          scrollbarWidth: 'none',
        }}
      >
        {displayItems.length === 0 ? (
          <p style={{ fontSize: 11, color: glass.textMuted, textAlign: 'center', marginTop: 24 }}>
            色がありません
          </p>
        ) : (
          displayItems.map((item, i) => (
            <ColorRow
              key={`${item.hex}-${i}`}
              hex={item.hex}
              glass={glass}
              onCopy={() => navigator.clipboard.writeText(item.hex)}
              onApply={() => handleApply(item.hex)}
              onConfirm={() => handleConfirm(item.hex)}
            />
          ))
        )}
      </div>

      {/* ── フッター ── */}
      <div
        style={{
          borderTop: `0.5px solid ${glass.dockBorder}`,
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {/* 履歴タブ */}
        <button
          onClick={() => setActiveFolderIndex(0)}
          title="履歴"
          style={{
            background: activeFolderIndex === 0 ? glass.accentBg : 'none',
            border: `0.5px solid ${activeFolderIndex === 0 ? glass.accentBorder : 'transparent'}`,
            borderRadius: 6,
            color: activeFolderIndex === 0 ? glass.accentColor : glass.textMuted,
            fontSize: 11, padding: '3px 8px', cursor: 'pointer',
          }}
        >
          <IconClock size={14} />
        </button>

        {/* フォルダドロップダウン */}
        <div style={{ position: 'relative', flex: 1 }}>
          <button
            onClick={() => setFolderDropdownOpen(v => !v)}
            style={{
              width: '100%',
              background: glass.buttonBg,
              border: `0.5px solid ${glass.buttonBorder}`,
              borderRadius: 6,
              color: glass.textMuted,
              fontSize: 10,
              padding: '3px 8px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {folderLabel}
            </span>
            <IconCaretDown size={10} />
          </button>
          {folderDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0, right: 0,
                background: isDark ? 'rgba(14,19,32,0.96)' : 'rgba(242,245,255,0.96)',
                border: `0.5px solid ${glass.dockBorder}`,
                borderRadius: 8,
                padding: 4,
                marginBottom: 4,
                maxHeight: 140,
                overflowY: 'auto',
                zIndex: 10,
              }}
            >
              <button
                onClick={() => { setActiveFolderIndex(0); setFolderDropdownOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: activeFolderIndex === 0 ? glass.accentBg : 'none',
                  border: 'none', borderRadius: 5, padding: '4px 8px',
                  color: glass.textPrimary, fontSize: 11, cursor: 'pointer',
                }}
              >
                履歴
              </button>
              {folders.map((folder, i) => (
                <button
                  key={folder.id}
                  onClick={() => { setActiveFolderIndex(i + 1); setFolderDropdownOpen(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: activeFolderIndex === i + 1 ? glass.accentBg : 'none',
                    border: 'none', borderRadius: 5, padding: '4px 8px',
                    color: glass.textPrimary, fontSize: 11, cursor: 'pointer',
                  }}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* フォルダ保存ボタン */}
        <button
          onClick={handleSaveToFolder}
          disabled={activeFolderIndex === 0}
          title="現在色をこのフォルダに保存"
          style={{
            background: activeFolderIndex > 0 ? glass.accentBg : glass.buttonBg,
            border: `0.5px solid ${glass.accentBorder}`,
            borderRadius: 6,
            color: activeFolderIndex > 0 ? glass.accentColor : glass.textExtra,
            fontSize: 14,
            padding: '3px 8px',
            cursor: activeFolderIndex > 0 ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IconPlus size={14} />
        </button>
      </div>
    </motion.div>
  )
}
