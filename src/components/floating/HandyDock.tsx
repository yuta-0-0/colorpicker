// src/components/floating/HandyDock.tsx
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useFloatingStore } from '@/store/floatingStore'
import type { SnapSide } from '@/types/floating'
import { IconCopy, IconCheck, IconArrowUpRight, IconClock, IconCaretDown, IconPlus } from '@/components/ui/Icons'

interface HandyDockProps {
  snapSide: SnapSide
}

function ColorRow({ hex, onCopy, onApply }: { hex: string; onCopy: () => void; onApply: () => void }) {
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
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 10px',
        borderRadius: 8,
        cursor: 'default',
        transition: 'background 80ms ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: hex,
          border: '0.5px solid rgba(255,255,255,0.15)',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)', flex: 1 }}>
        {hex.toUpperCase()}
      </span>
      <button
        onClick={handleCopy}
        style={{
          background: 'none',
          border: 'none',
          color: copied ? 'rgba(80,176,211,0.9)' : 'rgba(255,255,255,0.35)',
          cursor: 'pointer',
          fontSize: 11,
          padding: '2px 4px',
        }}
        title="コピー"
      >
        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
      </button>
      <button
        onClick={onApply}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.35)',
          cursor: 'pointer',
          fontSize: 11,
          padding: '2px 4px',
        }}
        title="メインウィンドウで選択"
      >
        <IconArrowUpRight size={12} />
      </button>
    </div>
  )
}

export function HandyDock({ snapSide }: HandyDockProps) {
  const { history, folders, activeFolderIndex, setActiveFolderIndex, currentColor } = useFloatingStore()
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false)

  // Toolbar が右端スナップのときは Dock が左側に展開される
  // それ以外（左スナップ・フリー）は右側展開
  const isDockOnRight = snapSide !== 'right'

  // Dock が右にある → toolbar 側（左）から引き出すように x=-12 → 0
  // Dock が左にある → toolbar 側（右）から引き出すように x=+12 → 0
  const slideX = isDockOnRight ? -12 : 12

  const displayItems = activeFolderIndex === 0
    ? history.slice(0, 20)
    : (folders[activeFolderIndex - 1]?.colors ?? [])

  const activeFolder = activeFolderIndex > 0 ? folders[activeFolderIndex - 1] : null
  const folderLabel = activeFolderIndex === 0 ? '履歴' : (activeFolder?.name ?? '')

  const handleApply = (hex: string) => {
    window.electronAPI?.floatingColorSelected(hex)
  }

  const handleSaveToFolder = () => {
    if (activeFolderIndex === 0) return
    window.electronAPI?.floatingColorSelected(currentColor.hex)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: slideX }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: slideX }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      style={{
        width: 320,
        height: 320,
        borderRadius: 16,
        background: 'rgba(18, 24, 38, 0.70)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: isDockOnRight ? '0 0 0 4px' : '0 4px 0 0',
        flexShrink: 0,
      } as React.CSSProperties}
    >
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
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 24 }}>
            色がありません
          </p>
        ) : (
          displayItems.map((item, i) => (
            <ColorRow
              key={`${item.hex}-${i}`}
              hex={item.hex}
              onCopy={() => navigator.clipboard.writeText(item.hex)}
              onApply={() => handleApply(item.hex)}
            />
          ))
        )}
      </div>

      {/* ── フッター ── */}
      <div
        style={{
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
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
            background: activeFolderIndex === 0 ? 'rgba(80,176,211,0.20)' : 'none',
            border: activeFolderIndex === 0 ? '0.5px solid rgba(80,176,211,0.40)' : '0.5px solid transparent',
            borderRadius: 6,
            color: activeFolderIndex === 0 ? 'rgba(80,176,211,0.9)' : 'rgba(255,255,255,0.35)',
            fontSize: 11,
            padding: '3px 8px',
            cursor: 'pointer',
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
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: 'rgba(255,255,255,0.6)',
              fontSize: 10,
              padding: '3px 8px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
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
                left: 0,
                right: 0,
                background: 'rgba(14, 19, 32, 0.95)',
                border: '0.5px solid rgba(255,255,255,0.12)',
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
                  background: activeFolderIndex === 0 ? 'rgba(80,176,211,0.15)' : 'none',
                  border: 'none', borderRadius: 5, padding: '4px 8px',
                  color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer',
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
                    background: activeFolderIndex === i + 1 ? 'rgba(80,176,211,0.15)' : 'none',
                    border: 'none', borderRadius: 5, padding: '4px 8px',
                    color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer',
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
            background: activeFolderIndex > 0 ? 'rgba(80,176,211,0.20)' : 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(80,176,211,0.30)',
            borderRadius: 6,
            color: activeFolderIndex > 0 ? 'rgba(80,176,211,0.9)' : 'rgba(255,255,255,0.20)',
            fontSize: 14,
            padding: '3px 8px',
            cursor: activeFolderIndex > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconPlus size={14} />
        </button>
      </div>
    </motion.div>
  )
}
