import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { findLegendaryColor } from '@/lib/data/legendaryColors'
import { IconButton } from '@/components/ui/IconButton'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { calcTAC, isTACWarning, isOutOfGamut, cmykSourceLabel } from '@/lib/printUtils'
import type { Color } from '@/types/database'
import { copyColorToClipboard } from '@/lib/exportUtils'
import { getEnglishColorName, getTraditionalColorNameSync } from '@/lib/colorUtils'
import {
  IconStar,
  IconLock, IconLockOpen,
  IconArchive, IconArrowUUpLeft,
  IconX, IconCopy, IconCheck, IconPencil,
} from '@/components/ui/Icons'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const k = 1 - Math.max(rn, gn, bn)
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 }
  const d = 1 - k
  return {
    c: Math.round((1 - rn - k) / d * 100),
    m: Math.round((1 - gn - k) / d * 100),
    y: Math.round((1 - bn - k) / d * 100),
    k: Math.round(k * 100),
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
      const approx = rgbToCmyk(r, g, b)
      return `C${approx.c} M${approx.m} Y${approx.y} K${approx.k}（近似値）`
    }
    default: return color.hex
  }
}

function FormatRow({ label, value, onCopy, colorHex, colorAlpha }: {
  label: string
  value: string
  onCopy: () => void
  colorHex?: string
  colorAlpha?: number
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (colorHex && label === 'HEX') {
      copyColorToClipboard(colorHex, colorAlpha ?? 1, value)
    } else {
      navigator.clipboard.writeText(value)
    }
    setCopied(true)
    onCopy()
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/10 last:border-0">
      <span className="text-xs text-text-muted w-10 flex-shrink-0">{label}</span>
      <span className="flex-1 text-xs text-text-secondary font-mono truncate">{value}</span>
      <button onClick={handleCopy} type="button" className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0">
        {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
      </button>
    </div>
  )
}

interface CmykDraft {
  c: number
  m: number
  y: number
  k: number
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
  const [enName, setEnName] = useState('')
  const [traditionalName, setTraditionalName] = useState('')

  // Legendary Match
  const legendary = color ? findLegendaryColor(color.hex) : null
  const [showGlow, setShowGlow] = useState(false)
  const [autofilled, setAutofilled] = useState(false)
  const prevHexRef = useRef<string | null>(null)

  // HEXが変わったときにautofilled状態をリセット
  useEffect(() => {
    setAutofilled(false)
  }, [color?.hex])

  useEffect(() => {
    if (!color) return
    if (legendary && color.hex !== prevHexRef.current) {
      setShowGlow(true)
      const t = setTimeout(() => setShowGlow(false), 1200)
      return () => clearTimeout(t)
    }
    prevHexRef.current = color.hex
  }, [color?.hex, legendary])

  const handleLegendaryAutofill = () => {
    if (!color || !legendary) return
    const updates: Record<string, string> = {}
    // メモが空ならブランド説明を流し込む
    if (!color.memo) updates.memo = legendary.description
    // 色名がHEX文字列（#で始まる）またはデフォルトのままならブランド名に上書き
    if (!color.name || /^#[0-9A-Fa-f]{6}$/i.test(color.name)) updates.name = legendary.brand
    if (Object.keys(updates).length > 0) {
      updateColor(color.id, updates)
    }
    setAutofilled(true)
  }

  useEffect(() => {
    if (!color) return
    setEnName('')
    setTraditionalName(getTraditionalColorNameSync(color.hex))
    getEnglishColorName(color.hex).then(setEnName)
  }, [color?.hex])
  const [spotColorValue, setSpotColorValue] = useState(color?.spot_color ?? '')
  const [cmykDraft, setCmykDraft] = useState<CmykDraft>({ c: 0, m: 0, y: 0, k: 0 })
  const [isEditingCmyk, setIsEditingCmyk] = useState(false)
  const [isEditingHex, setIsEditingHex] = useState(false)
  const [hexDraft, setHexDraft] = useState('')

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

  const handleSpotColorSubmit = () => {
    if (!color) return
    updateColor(color.id, { spot_color: spotColorValue.trim() || null })
  }

  const handleCmykEdit = () => {
    if (!color) return
    // 手動入力値があればそれを、なければRGBから近似値を計算して初期値に
    if (color.c != null && color.m != null && color.y != null && color.k != null) {
      setCmykDraft({ c: color.c, m: color.m, y: color.y, k: color.k })
    } else {
      const { r, g, b } = hexToRgb(color.hex)
      setCmykDraft(rgbToCmyk(r, g, b))
    }
    setIsEditingCmyk(true)
  }

  const handleCmykSave = () => {
    if (!color) return
    const clamped: CmykDraft = {
      c: Math.min(100, Math.max(0, cmykDraft.c)),
      m: Math.min(100, Math.max(0, cmykDraft.m)),
      y: Math.min(100, Math.max(0, cmykDraft.y)),
      k: Math.min(100, Math.max(0, cmykDraft.k)),
    }
    updateColor(color.id, { ...clamped, cmyk_source: 'manual' })
    setIsEditingCmyk(false)
  }

  const handleCmykCancel = () => {
    setIsEditingCmyk(false)
  }

  // color が変わったら spot_color を同期
  useEffect(() => {
    setSpotColorValue(color?.spot_color ?? '')
  }, [color?.id])

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(hexDraft)

  const handleHexSave = () => {
    if (!color || !isValidHex) { setIsEditingHex(false); return }
    if (hexDraft.toUpperCase() !== color.hex) {
      updateColor(color.id, { hex: hexDraft.toUpperCase() })
    }
    setIsEditingHex(false)
  }

  const handleCmykChannelChange = (channel: keyof CmykDraft, value: string) => {
    const num = parseInt(value, 10)
    setCmykDraft((prev) => ({ ...prev, [channel]: isNaN(num) ? 0 : num }))
  }

  if (!color) return null

  const FORMATS = ['HEX', 'RGB', 'RGBA', 'HSL', 'HSLA', 'CMYK']

  // TAC・ガマット警告の計算
  const hasCmyk = color.c != null && color.m != null && color.y != null && color.k != null
  const tac = hasCmyk ? calcTAC(color.c!, color.m!, color.y!, color.k!) : null
  const tacWarning = tac !== null ? isTACWarning(tac) : false
  const gamutWarning = isOutOfGamut(color.hex)
  const sourceLabel = cmykSourceLabel(color.cmyk_source)

  // CMYK 入力中の TAC プレビュー
  const draftTac = isEditingCmyk ? calcTAC(cmykDraft.c, cmykDraft.m, cmykDraft.y, cmykDraft.k) : null
  const draftTacWarning = draftTac !== null ? isTACWarning(draftTac) : false

  const { r, g, b } = color ? hexToRgb(color.hex) : { r: 10, g: 62, b: 216 }

  return (
    <aside
      className="flex-1 flex flex-col overflow-hidden relative"
    >
      {/* Legendary Glow オーバーレイ */}
      <AnimatePresence>
        {showGlow && legendary && (
          <motion.div
            key="legendary-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-10 pointer-events-none rounded-r-none"
            style={{
              background: `radial-gradient(ellipse at center, rgba(${r},${g},${b},0.28) 0%, rgba(${r},${g},${b},0) 70%)`,
              boxShadow: `inset 0 0 60px rgba(${r},${g},${b},0.2)`,
            }}
          />
        )}
      </AnimatePresence>
      {/* ヘッダー（固定） */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">詳細</span>
          {/* お気に入り */}
          <IconButton
            onClick={() => updateColor(color.id, { is_favorite: !color.is_favorite })}
            active={color.is_favorite}
            title={color.is_favorite ? 'お気に入り解除' : 'お気に入り'}
          >
            <IconStar size={14} weight={color.is_favorite ? 'fill' : 'regular'} />
          </IconButton>
          {/* ロック */}
          <IconButton
            onClick={() => updateColor(color.id, { is_locked: !color.is_locked })}
            active={color.is_locked}
            title={color.is_locked ? 'ロック解除' : 'ロックする'}
          >
            {color.is_locked ? <IconLock size={14} /> : <IconLockOpen size={14} />}
          </IconButton>
          {/* アーカイブ */}
          <IconButton
            onClick={() => updateColor(color.id, { is_archived: !color.is_archived })}
            title={color.is_archived ? 'アーカイブ解除' : 'アーカイブ'}
          >
            {color.is_archived ? <IconArrowUUpLeft size={14} /> : <IconArchive size={14} />}
          </IconButton>
        </div>
        <IconButton onClick={handleClose} title="閉じる"><IconX size={14} /></IconButton>
      </div>

      {/* 丸アイコン + 背景切り替え（固定） */}
      <div
        className="flex items-center justify-center py-8 relative transition-colors flex-shrink-0"
        style={{ backgroundColor: bgMode === 'dark' ? '#111' : '#f5f5f5' }}
      >
        <ColorSwatch hex={color.hex} alpha={color.alpha} size="lg" />
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button onClick={() => setBgMode('dark')} type="button" className={['w-5 h-5 rounded-full bg-black border transition-all', bgMode === 'dark' ? 'border-accent scale-110' : 'border-border/15'].join(' ')} />
          <button onClick={() => setBgMode('light')} type="button" className={['w-5 h-5 rounded-full bg-white border transition-all', bgMode === 'light' ? 'border-accent scale-110' : 'border-border/15'].join(' ')} />
        </div>
      </div>

      {/* スクロール可能なコンテンツ領域 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 py-3 space-y-4">
        {/* 色名エリア */}
        <div className="space-y-1.5">
          {/* 編集可能な色名（ユーザー設定名 or デフォルトはHEX） */}
          {isEditingName ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') handleNameSubmit(); if (e.key === 'Escape') setIsEditingName(false) }}
              autoFocus
              className="w-full bg-surface-overlay border border-accent rounded-md px-2 py-1 text-base font-medium text-text-primary focus:outline-none"
            />
          ) : (
            <button
              onClick={() => { if (!color.is_locked) { setNameValue(color.name); setIsEditingName(true) } }}
              type="button"
              className="text-base font-medium text-text-primary hover:text-accent transition-colors text-left w-full truncate"
              title={color.is_locked ? 'ロック中のため編集できません' : 'クリックして編集'}
            >
              {color.name || color.hex}
            </button>
          )}

          {/* 英語名 / 伝統色名 */}
          {(enName || traditionalName) && (
            <p className="flex items-center gap-1.5 min-w-0">
              {enName && (
                <span className="text-xs font-medium text-text-secondary truncate">{enName}</span>
              )}
              {enName && traditionalName && (
                <span className="text-xs text-text-muted/40 flex-shrink-0">/</span>
              )}
              {traditionalName && (
                <span className="text-xs text-text-muted truncate">{traditionalName}</span>
              )}
            </p>
          )}

          {/* Legendary Match バッジ */}
          <AnimatePresence>
            {legendary && (
              <motion.div
                key="legendary-badge"
                initial={{ opacity: 0, scale: 0.85, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="mt-2 rounded-xl overflow-hidden"
                style={{
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                  background: `rgba(${r},${g},${b},0.12)`,
                  border: `1px solid rgba(${r},${g},${b},0.3)`,
                  boxShadow: `0 0 16px rgba(${r},${g},${b},0.18), inset 0 1px 0 rgba(255,255,255,0.08)`,
                }}
              >
                {/* ヘッダー行：ラベル + ロゴ */}
                <div className="flex items-center justify-between px-2.5 pt-2 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color: `rgb(${r},${g},${b})` }}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <div>
                      <p className="text-[9px] font-semibold tracking-widest uppercase leading-none mb-0.5" style={{ color: `rgb(${r},${g},${b})` }}>
                        Legendary Match
                      </p>
                      <p className="text-xs text-text-primary font-medium leading-none">{legendary.brand}</p>
                    </div>
                  </div>
                  {/* ブランドロゴ */}
                  {legendary.imageUrl && (
                    <img
                      src={legendary.imageUrl}
                      alt={legendary.brand}
                      className="w-7 h-7 rounded-md object-contain bg-white/10 p-0.5 flex-shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                </div>

                {/* 説明文 */}
                <p className="px-2.5 pb-2 text-[10px] text-text-muted leading-relaxed">
                  {legendary.description}
                </p>

                {/* アクション行 */}
                <div
                  className="flex items-center gap-1 px-2 pb-2"
                  style={{ borderTop: `1px solid rgba(${r},${g},${b},0.15)`, paddingTop: '6px' }}
                >
                  {/* 自動フィルボタン */}
                  <button
                    type="button"
                    onClick={handleLegendaryAutofill}
                    disabled={autofilled}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all flex-1 justify-center"
                    style={{
                      background: autofilled ? `rgba(${r},${g},${b},0.08)` : `rgba(${r},${g},${b},0.22)`,
                      color: autofilled ? `rgba(${r},${g},${b},0.6)` : `rgb(${r},${g},${b})`,
                      border: `1px solid rgba(${r},${g},${b},0.25)`,
                    }}
                  >
                    {autofilled ? (
                      <><span>✓</span> フィル済み</>
                    ) : (
                      <><span>✦</span> メモ・名前を自動フィル</>
                    )}
                  </button>
                  {/* 公式サイトリンク */}
                  {legendary.url && (
                    <a
                      href={legendary.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                      style={{
                        background: `rgba(${r},${g},${b},0.1)`,
                        border: `1px solid rgba(${r},${g},${b},0.2)`,
                      }}
                      title={`${legendary.brand} 公式サイト`}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* カラーコード */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-text-muted">カラーコード</p>
            {!color.is_locked && !isEditingHex && (
              <button
                type="button"
                onClick={() => { setHexDraft(color.hex); setIsEditingHex(true) }}
                className="text-text-muted hover:text-text-primary transition-colors"
                title="HEXを編集"
              ><IconPencil size={13} /></button>
            )}
          </div>
          {isEditingHex && (
            <div className="mb-2 flex items-center gap-2">
              <input
                type="text"
                value={hexDraft}
                onChange={(e) => setHexDraft(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return
                  if (e.key === 'Enter' && isValidHex) handleHexSave()
                  if (e.key === 'Escape') setIsEditingHex(false)
                }}
                onBlur={handleHexSave}
                autoFocus
                maxLength={7}
                placeholder="#RRGGBB"
                className={[
                  'flex-1 bg-surface-overlay border rounded-md px-2 py-1 text-sm font-mono text-text-primary focus:outline-none transition-colors',
                  isValidHex ? 'border-border/20 focus:border-accent' : 'border-red-500/60',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={handleHexSave}
                disabled={!isValidHex}
                className="text-xs px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-md transition-colors"
              >保存</button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsEditingHex(false)}
                className="text-xs px-2 py-1 bg-surface-raised hover:bg-surface-overlay text-text-secondary rounded-md transition-colors"
              >✕</button>
            </div>
          )}
          <div className="bg-surface-raised rounded-lg px-3 py-1">
            {FORMATS.map((fmt) => (
              <FormatRow
                key={fmt}
                label={fmt}
                value={formatColor(color, fmt)}
                onCopy={() => incrementUsedCount(color.id)}
                colorHex={color.hex}
                colorAlpha={color.alpha}
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

        {/* ガマット警告 */}
        {gamutWarning && (
          <div className="flex items-start gap-2 px-2.5 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <span className="text-yellow-400 text-xs flex-shrink-0 mt-0.5">⚠</span>
            <p className="text-xs text-yellow-300 leading-snug">
              この色はCMYK印刷で正確に再現できない可能性があります（色域外）
            </p>
          </div>
        )}

        {/* CMYK（手動入力） */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-text-muted">CMYK（印刷用）</p>
            {sourceLabel && (
              <span className="text-xs text-text-muted bg-surface-raised px-1.5 py-0.5 rounded-md">{sourceLabel}</span>
            )}
          </div>

          {isEditingCmyk ? (
            <div className="space-y-2">
              {/* 入力フィールド */}
              <div className="grid grid-cols-4 gap-1.5">
                {(['c', 'm', 'y', 'k'] as const).map((ch) => (
                  <div key={ch} className="flex flex-col items-center gap-1">
                    <label className="text-xs text-text-muted uppercase">{ch}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={cmykDraft[ch]}
                      onChange={(e) => handleCmykChannelChange(ch, e.target.value)}
                      className="w-full text-center text-xs font-mono bg-surface-overlay border border-border/20 rounded-md px-1 py-1 text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
              {/* 入力中 TAC プレビュー */}
              <div className={['flex items-center justify-between px-2 py-1 rounded-md text-xs', draftTacWarning ? 'bg-red-500/10 border border-red-500/30' : 'bg-surface-raised'].join(' ')}>
                <span className="text-text-muted">TAC合計</span>
                <span className={['font-mono font-medium', draftTacWarning ? 'text-red-400' : 'text-text-secondary'].join(' ')}>
                  {draftTac}%{draftTacWarning ? ' ⚠ 上限超過' : ''}
                </span>
              </div>
              {/* 操作ボタン */}
              <div className="flex gap-1.5">
                <button
                  onClick={handleCmykSave}
                  type="button"
                  className="flex-1 py-1 bg-accent hover:bg-accent-hover text-white text-xs rounded-md transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={handleCmykCancel}
                  type="button"
                  className="flex-1 py-1 bg-surface-raised hover:bg-surface-overlay text-text-secondary text-xs rounded-md transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 表示モード */}
              {!hasCmyk && (
                <p className="text-xs text-text-muted">近似値（RGB変換）</p>
              )}
              <div className="grid grid-cols-4 gap-1.5">
                {(['c', 'm', 'y', 'k'] as const).map((ch) => {
                  const { r, g, b } = hexToRgb(color.hex)
                  const approx = rgbToCmyk(r, g, b)
                  const displayVal = color[ch] != null ? Math.round(color[ch]!) : approx[ch]
                  return (
                    <div key={ch} className="text-center">
                      <p className="text-xs text-text-muted uppercase">{ch}</p>
                      <p className={['text-sm font-mono', hasCmyk ? 'text-text-primary' : 'text-text-muted'].join(' ')}>
                        {displayVal}
                      </p>
                    </div>
                  )
                })}
              </div>
              {/* TAC 表示（保存済み値がある場合） */}
              {hasCmyk && tac !== null && (
                <div className={['flex items-center justify-between px-2 py-1 rounded-md text-xs', tacWarning ? 'bg-red-500/10 border border-red-500/30' : 'bg-surface-raised'].join(' ')}>
                  <span className="text-text-muted">TAC合計</span>
                  <span className={['font-mono font-medium', tacWarning ? 'text-red-400' : 'text-text-secondary'].join(' ')}>
                    {Math.round(tac)}%{tacWarning ? ' ⚠ 上限超過' : ''}
                  </span>
                </div>
              )}
              {/* 編集ボタン */}
              {!color.is_locked && (
                <button
                  onClick={handleCmykEdit}
                  type="button"
                  className="w-full py-1 text-xs text-text-muted hover:text-text-primary bg-surface-raised hover:bg-surface-overlay rounded-md transition-colors"
                >
                  {hasCmyk ? 'CMYK を編集' : '近似値をもとに入力'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 特色メモ（常時表示入力欄） */}
        <div>
          <p className="text-xs text-text-muted mb-1">特色メモ</p>
          <input
            type="text"
            value={spotColorValue}
            onChange={(e) => { if (!color.is_locked) setSpotColorValue(e.target.value) }}
            onBlur={handleSpotColorSubmit}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return
              if (e.key === 'Enter') handleSpotColorSubmit()
              if (e.key === 'Escape') setSpotColorValue(color.spot_color ?? '')
            }}
            disabled={color.is_locked}
            placeholder="PANTONE 286 C / DIC-43"
            className="w-full bg-surface-overlay border border-border/20 rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
          />
        </div>

      </div>
    </aside>
  )
}
