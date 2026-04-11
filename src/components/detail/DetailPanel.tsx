import { useState, useEffect } from 'react'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { IconButton } from '@/components/ui/IconButton'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { calcTAC, isTACWarning, isOutOfGamut, cmykSourceLabel } from '@/lib/printUtils'
import type { Color } from '@/types/database'
import { ContrastChecker } from '@/components/detail/ContrastChecker'
import { copyColorToClipboard } from '@/lib/exportUtils'
import { getEnglishColorName, getKatakanaColorName, getTraditionalColorNameSync } from '@/lib/colorUtils'
import {
  IconStar, IconStarFilled,
  IconLock, IconLockOpen,
  IconArchive, IconArchiveOut,
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
    <div className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
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
  const [katakanaName, setKatakanaName] = useState('')
  const [traditionalName, setTraditionalName] = useState('')

  useEffect(() => {
    if (!color) return
    setEnName('')
    setKatakanaName('')
    setTraditionalName(getTraditionalColorNameSync(color.hex))
    getEnglishColorName(color.hex).then(setEnName)
    getKatakanaColorName(color.hex).then(setKatakanaName)
  }, [color?.hex])
  const [isEditingSpotColor, setIsEditingSpotColor] = useState(false)
  const [spotColorValue, setSpotColorValue] = useState('')
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
    setIsEditingSpotColor(false)
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
            {color.is_favorite ? <IconStarFilled size={14} /> : <IconStar size={14} />}
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
            {color.is_archived ? <IconArchiveOut size={14} /> : <IconArchive size={14} />}
          </IconButton>
        </div>
        <IconButton onClick={handleClose} title="閉じる"><IconX size={14} /></IconButton>
      </div>

      {/* 丸アイコン + 背景切り替え：透明度がある場合は実際に透けて見えるよう表示 */}
      <div
        className="flex items-center justify-center py-8 relative transition-colors"
        style={{ backgroundColor: bgMode === 'dark' ? '#111' : '#f5f5f5' }}
      >
        {/* alpha < 1 の場合は CSS rgba で実際の透過を表現（チェッカー柄ではなく背景が透けて見える） */}
        {color.alpha < 1 ? (
          <div
            className="rounded-full flex-shrink-0"
            style={{
              width: 72,
              height: 72,
              backgroundColor: `rgba(${parseInt(color.hex.slice(1,3),16)}, ${parseInt(color.hex.slice(3,5),16)}, ${parseInt(color.hex.slice(5,7),16)}, ${color.alpha})`,
            }}
          />
        ) : (
          <ColorSwatch hex={color.hex} alpha={color.alpha} size="lg" />
        )}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button onClick={() => setBgMode('dark')} type="button" className={['w-5 h-5 rounded-full bg-black border transition-all', bgMode === 'dark' ? 'border-accent scale-110' : 'border-border'].join(' ')} />
          <button onClick={() => setBgMode('light')} type="button" className={['w-5 h-5 rounded-full bg-white border transition-all', bgMode === 'light' ? 'border-accent scale-110' : 'border-border'].join(' ')} />
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-4">
        {/* 色名エリア */}
        <div className="space-y-1.5">
          {/* 編集可能な色名（ユーザー設定名 or デフォルトはHEX） */}
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
              className="text-base font-medium text-text-primary hover:text-accent transition-colors text-left w-full truncate"
              title={color.is_locked ? 'ロック中のため編集できません' : 'クリックして編集'}
            >
              {color.name || color.hex}
            </button>
          )}

          {/* 英語名 */}
          {enName && (
            <p className="text-xs text-text-muted truncate">{enName}</p>
          )}

          {/* カタカナ名 */}
          {katakanaName && (
            <p className="text-xs text-text-muted truncate">{katakanaName}</p>
          )}

          {/* 伝統色名（距離閾値内の場合のみ表示） */}
          {traditionalName && (
            <p className="text-xs text-text-muted truncate">{traditionalName}</p>
          )}
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
                  if (e.key === 'Enter' && isValidHex) handleHexSave()
                  if (e.key === 'Escape') setIsEditingHex(false)
                }}
                onBlur={handleHexSave}
                autoFocus
                maxLength={7}
                placeholder="#RRGGBB"
                className={[
                  'flex-1 bg-surface-overlay border rounded px-2 py-1 text-sm font-mono text-text-primary focus:outline-none transition-colors',
                  isValidHex ? 'border-border focus:border-accent' : 'border-red-500/60',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={handleHexSave}
                disabled={!isValidHex}
                className="text-xs px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded transition-colors"
              >保存</button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsEditingHex(false)}
                className="text-xs px-2 py-1 bg-surface-raised hover:bg-surface-overlay text-text-secondary rounded transition-colors"
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
              <span className="text-xs text-text-muted bg-surface-raised px-1.5 py-0.5 rounded">{sourceLabel}</span>
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
                      className="w-full text-center text-xs font-mono bg-surface-overlay border border-border rounded px-1 py-1 text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
              {/* 入力中 TAC プレビュー */}
              <div className={['flex items-center justify-between px-2 py-1 rounded text-xs', draftTacWarning ? 'bg-red-500/10 border border-red-500/30' : 'bg-surface-raised'].join(' ')}>
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
                  className="flex-1 py-1 bg-accent hover:bg-accent-hover text-white text-xs rounded transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={handleCmykCancel}
                  type="button"
                  className="flex-1 py-1 bg-surface-raised hover:bg-surface-overlay text-text-secondary text-xs rounded transition-colors"
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
                <div className={['flex items-center justify-between px-2 py-1 rounded text-xs', tacWarning ? 'bg-red-500/10 border border-red-500/30' : 'bg-surface-raised'].join(' ')}>
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
                  className="w-full py-1 text-xs text-text-muted hover:text-text-primary bg-surface-raised hover:bg-surface-overlay rounded transition-colors"
                >
                  {hasCmyk ? 'CMYK を編集' : '近似値をもとに入力'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 特色メモ（クリックで編集） */}
        <div>
          <p className="text-xs text-text-muted mb-1">特色メモ</p>
          {isEditingSpotColor ? (
            <input
              type="text"
              value={spotColorValue}
              onChange={(e) => setSpotColorValue(e.target.value)}
              onBlur={handleSpotColorSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSpotColorSubmit()
                if (e.key === 'Escape') setIsEditingSpotColor(false)
              }}
              autoFocus
              placeholder="PANTONE 286 C / DIC-43"
              className="w-full bg-surface-overlay border border-accent rounded px-2 py-1 text-sm text-text-primary focus:outline-none placeholder:text-text-muted"
            />
          ) : (
            <button
              onClick={() => {
                if (!color.is_locked) {
                  setSpotColorValue(color.spot_color ?? '')
                  setIsEditingSpotColor(true)
                }
              }}
              type="button"
              className="w-full text-left text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {color.spot_color || <span className="text-text-muted">クリックして追加...</span>}
            </button>
          )}
        </div>

        {/* コントラストチェッカー・色覚シミュレーション */}
        <ContrastChecker color={color} />
      </div>
    </aside>
  )
}
