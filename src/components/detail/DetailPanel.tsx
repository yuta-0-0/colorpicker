import { useState } from 'react'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { IconButton } from '@/components/ui/IconButton'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import type { Color } from '@/types/database'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  h = Math.round(h * 60 + (h < 0 ? 360 : 0))
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) }
}

function formatColor(color: Color, format: string): string {
  const { r, g, b } = hexToRgb(color.hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  const a = color.alpha
  switch (format) {
    case 'HEX': return color.hex
    case 'RGB': return `rgb(${r}, ${g}, ${b})`
    case 'RGBA': return `rgba(${r}, ${g}, ${b}, ${a})`
    case 'HSL': return `hsl(${h}, ${s}%, ${l}%)`
    case 'HSLA': return `hsla(${h}, ${s}%, ${l}%, ${a})`
    case 'CMYK': {
      if (color.c != null && color.m != null && color.y != null && color.k != null) {
        return `C${Math.round(color.c)} M${Math.round(color.m)} Y${Math.round(color.y)} K${Math.round(color.k)}`
      }
      return '未入力'
    }
    default: return color.hex
  }
}

function FormatRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    onCopy()
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-text-muted w-10 flex-shrink-0">{label}</span>
      <span className="flex-1 text-xs text-text-secondary font-mono truncate">{value}</span>
      <button onClick={handleCopy} type="button" className="text-xs text-text-muted hover:text-text-primary transition-colors flex-shrink-0">
        {copied ? '✓' : '⎘'}
      </button>
    </div>
  )
}

interface DetailPanelProps {
  color: Color | null
}

export function DetailPanel({ color }: DetailPanelProps) {
  const { setSelectedColorId, setIsDetailPanelOpen } = useUIStore()
  const { updateColor, incrementUsedCount } = useColorStore()
  const [bgMode, setBgMode] = useState<'dark' | 'light'>('dark')
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [isEditingMemo, setIsEditingMemo] = useState(false)
  const [memoValue, setMemoValue] = useState('')

  const handleClose = () => {
    setSelectedColorId(null)
    setIsDetailPanelOpen(false)
  }

  const handleNameSubmit = () => {
    if (!color) return
    if (nameValue.trim() !== color.name) {
      updateColor(color.id, { name: nameValue.trim() })
    }
    setIsEditingName(false)
  }

  const handleMemoSubmit = () => {
    if (!color) return
    updateColor(color.id, { memo: memoValue.trim() || null })
    setIsEditingMemo(false)
  }

  if (!color) return null

  const FORMATS = ['HEX', 'RGB', 'RGBA', 'HSL', 'HSLA', 'CMYK']

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-l border-border bg-surface overflow-y-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">詳細</span>
          {/* お気に入り */}
          <IconButton
            onClick={() => updateColor(color.id, { is_favorite: !color.is_favorite })}
            active={color.is_favorite}
            title={color.is_favorite ? 'お気に入り解除' : 'お気に入り'}
          >
            {color.is_favorite ? '★' : '☆'}
          </IconButton>
          {/* ロック */}
          <IconButton
            onClick={() => updateColor(color.id, { is_locked: !color.is_locked })}
            active={color.is_locked}
            title={color.is_locked ? 'ロック解除' : 'ロックする'}
          >
            {color.is_locked ? '🔒' : '🔓'}
          </IconButton>
          {/* アーカイブ */}
          <IconButton
            onClick={() => updateColor(color.id, { is_archived: !color.is_archived })}
            title={color.is_archived ? 'アーカイブ解除' : 'アーカイブ'}
          >
            {color.is_archived ? '📤' : '📥'}
          </IconButton>
        </div>
        <IconButton onClick={handleClose} title="閉じる">✕</IconButton>
      </div>

      {/* 丸アイコン + 背景切り替え */}
      <div
        className="flex items-center justify-center py-8 relative transition-colors"
        style={{ backgroundColor: bgMode === 'dark' ? '#111' : '#f5f5f5' }}
      >
        <ColorSwatch hex={color.hex} alpha={color.alpha} size="lg" />
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button onClick={() => setBgMode('dark')} type="button" className={['w-5 h-5 rounded-full bg-black border transition-all', bgMode === 'dark' ? 'border-accent scale-110' : 'border-border'].join(' ')} />
          <button onClick={() => setBgMode('light')} type="button" className={['w-5 h-5 rounded-full bg-white border transition-all', bgMode === 'light' ? 'border-accent scale-110' : 'border-border'].join(' ')} />
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-4">
        {/* 色名（クリックで編集） */}
        <div>
          {isEditingName ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameSubmit(); if (e.key === 'Escape') setIsEditingName(false) }}
              autoFocus
              className="w-full bg-surface-overlay border border-accent rounded px-2 py-1 text-base font-medium text-text-primary focus:outline-none"
            />
          ) : (
            <button
              onClick={() => { if (!color.is_locked) { setNameValue(color.name); setIsEditingName(true) } }}
              type="button"
              className="text-base font-medium text-text-primary hover:text-accent transition-colors text-left w-full truncate disabled:cursor-not-allowed"
              title={color.is_locked ? 'ロック中のため編集できません' : 'クリックして編集'}
            >
              {color.name || color.hex}
            </button>
          )}
        </div>

        {/* カラーコード */}
        <div>
          <p className="text-xs text-text-muted mb-2">カラーコード</p>
          <div className="bg-surface-raised rounded-lg px-3 py-1">
            {FORMATS.map((fmt) => (
              <FormatRow
                key={fmt}
                label={fmt}
                value={formatColor(color, fmt)}
                onCopy={() => incrementUsedCount(color.id)}
              />
            ))}
          </div>
        </div>

        {/* 透明度 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-text-muted">透明度</p>
            <p className="text-xs text-text-secondary font-mono">{Math.round(color.alpha * 100)}%</p>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(color.alpha * 100)}
            onChange={(e) => {
              if (!color.is_locked) {
                updateColor(color.id, { alpha: parseInt(e.target.value) / 100 })
              }
            }}
            disabled={color.is_locked}
            className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* CMYK */}
        {(color.c != null || color.m != null) && (
          <div>
            <p className="text-xs text-text-muted mb-1.5">CMYK（印刷用）</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(['c', 'm', 'y', 'k'] as const).map((ch) => (
                <div key={ch} className="text-center">
                  <p className="text-xs text-text-muted uppercase">{ch}</p>
                  <p className="text-sm font-mono text-text-primary">{color[ch] != null ? Math.round(color[ch]!) : '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 特色メモ */}
        {color.spot_color && (
          <div>
            <p className="text-xs text-text-muted mb-1">特色メモ</p>
            <p className="text-sm text-text-secondary">{color.spot_color}</p>
          </div>
        )}

        {/* 一言メモ（クリックで編集） */}
        <div>
          <p className="text-xs text-text-muted mb-1">メモ</p>
          {isEditingMemo ? (
            <textarea
              value={memoValue}
              onChange={(e) => setMemoValue(e.target.value)}
              onBlur={handleMemoSubmit}
              onKeyDown={(e) => { if (e.key === 'Escape') setIsEditingMemo(false) }}
              autoFocus
              rows={3}
              className="w-full bg-surface-overlay border border-accent rounded px-2 py-1 text-sm text-text-primary focus:outline-none resize-none"
            />
          ) : (
            <button
              onClick={() => { if (!color.is_locked) { setMemoValue(color.memo ?? ''); setIsEditingMemo(true) } }}
              type="button"
              className="w-full text-left text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {color.memo || <span className="text-text-muted">クリックしてメモを追加...</span>}
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
