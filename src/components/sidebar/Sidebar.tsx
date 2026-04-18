import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  IconSquaresFour,
  IconStar,
  IconMagicWand,
  IconImageSquare,
  IconEyedropper,
  IconPlusCircle,
  IconLayout,
  IconCircleHalf,
  IconSwatches,
  IconTrash,
  IconDownloadSimple,
  IconSun,
  IconMoon,
  IconMagnifyingGlass,
  IconCaretRight,
  IconFolder,
  IconTag,
  IconClock,
  IconPalette,
  IconTrendUp,
  IconArchive,
  IconSortAsc,
  IconSortDesc,
  type PhosphorIcon,
} from '@/components/ui/Icons'
import { FolderList } from './FolderList'
import { TagList } from './TagList'
import { useUIStore, type ToneCategory, type ActiveMode } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useHistoryStore } from '@/store/historyStore'

// ─────────────────────────────────────────────────────────────────────────────
// インラインパレットパネル（フィルター・ソート）
// ─────────────────────────────────────────────────────────────────────────────
const HUE_FILTERS = [
  { label: '赤',    hex: '#ef4444' },
  { label: '橙',    hex: '#f97316' },
  { label: '黄',    hex: '#eab308' },
  { label: '緑',    hex: '#22c55e' },
  { label: '青',    hex: '#3b82f6' },
  { label: '紫',    hex: '#a855f7' },
  { label: 'ピンク', hex: '#ec4899' },
  { label: '白',    hex: '#f0f0f0' },
  { label: 'グレー', hex: '#888888' },
  { label: '黒',    hex: '#222222' },
]

const SORT_OPTIONS: { value: 'order' | 'hue' | 'used_count'; label: string; Icon: PhosphorIcon }[] = [
  { value: 'order',      label: '追加順', Icon: IconClock },
  { value: 'hue',        label: '色相順', Icon: IconPalette },
  { value: 'used_count', label: '使用順', Icon: IconTrendUp },
]

const TONE_FILTERS: { value: ToneCategory; label: string }[] = [
  { value: 'vivid',   label: 'ビビッド' },
  { value: 'pastel',  label: 'パステル' },
  { value: 'dark',    label: 'ダーク' },
  { value: 'light',   label: 'ライト' },
  { value: 'neutral', label: 'ニュートラル' },
]

function PalettePanel({
  onPaletteExport,
  onImport,
  onExportAll,
  onShortcutHelp,
}: {
  onPaletteExport: () => void
  onImport: () => void
  onExportAll: () => void
  onShortcutHelp: () => void
}) {
  const {
    showArchived, setShowArchived,
    activeHueFilter, setActiveHueFilter,
    sortBy, setSortBy,
    sortDirection, toggleSortDirection,
    activeTraditionalFilter, setActiveTraditionalFilter,
    activeToneFilter, setActiveToneFilter,
  } = useUIStore()

  return (
    <div className="space-y-3 py-2">
      {/* 色相 */}
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted mb-1.5 px-1">色相</p>
        <div className="flex flex-wrap gap-1.5 px-1">
          {HUE_FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              title={f.label}
              onClick={() => setActiveHueFilter(activeHueFilter === f.label ? null : f.label)}
              className={[
                'w-5 h-5 rounded-full flex items-center justify-center transition-all',
                activeHueFilter === f.label
                  ? 'ring-2 ring-accent ring-offset-1 ring-offset-transparent scale-110'
                  : 'opacity-70 hover:opacity-100 hover:scale-110',
              ].join(' ')}
            >
              <span className="w-3.5 h-3.5 rounded-full block" style={{ backgroundColor: f.hex }} />
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/6 mx-1" />

      {/* トーン */}
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted mb-1.5 px-1">トーン</p>
        <div className="flex flex-wrap gap-1 px-1">
          {TONE_FILTERS.map((tone) => (
            <button
              key={tone.value}
              type="button"
              onClick={() => setActiveToneFilter(activeToneFilter === tone.value ? null : tone.value)}
              className={[
                'px-1.5 py-0.5 rounded text-[10px] transition-colors leading-none',
                activeToneFilter === tone.value
                  ? 'bg-accent/20 text-accent-soft font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/8',
              ].join(' ')}
            >
              {tone.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveTraditionalFilter(!activeTraditionalFilter)}
            className={[
              'px-1.5 py-0.5 rounded text-[10px] transition-colors leading-none',
              activeTraditionalFilter
                ? 'bg-accent/20 text-accent-soft font-medium'
                : 'text-text-muted hover:text-text-secondary hover:bg-white/8',
            ].join(' ')}
          >
            伝統色
          </button>
        </div>
      </div>

      <div className="h-px bg-white/6 mx-1" />

      {/* 並び順 + アーカイブ */}
      <div className="flex items-center gap-0.5 px-1">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            onClick={() => setSortBy(opt.value)}
            className={[
              'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
              sortBy === opt.value
                ? 'bg-accent/15 text-accent-soft'
                : 'text-text-muted hover:text-text-secondary hover:bg-white/8',
            ].join(' ')}
          >
            <opt.Icon size={11} weight={sortBy === opt.value ? 'fill' : 'regular'} />
          </button>
        ))}
        <button
          type="button"
          title={sortDirection === 'asc' ? '昇順' : '降順'}
          onClick={toggleSortDirection}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-text-secondary hover:bg-white/8 transition-colors"
        >
          {sortDirection === 'asc' ? <IconSortAsc size={11} /> : <IconSortDesc size={11} />}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          title={showArchived ? 'アーカイブを非表示' : 'アーカイブを表示'}
          onClick={() => setShowArchived(!showArchived)}
          className={[
            'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
            showArchived ? 'bg-accent/15 text-accent-soft' : 'text-text-muted hover:text-text-secondary hover:bg-white/8',
          ].join(' ')}
        >
          <IconArchive size={11} weight={showArchived ? 'fill' : 'regular'} />
        </button>
      </div>

      <div className="h-px bg-white/6 mx-1" />

      {/* エクスポート */}
      <div>
        {[
          { label: 'パレット書き出し', onClick: onPaletteExport },
          { label: 'インポート', onClick: onImport },
          { label: '全データをバックアップ', onClick: onExportAll },
          { label: 'ショートカット一覧 (?)', onClick: onShortcutHelp },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-text-secondary hover:bg-white/8 hover:text-text-primary transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
interface SidebarProps {
  onAddColor: () => void
  onImagePick: () => void
  onScreenPick: () => void
  onVisualExport: () => void
  onPaletteExport: () => void
  onImport: () => void
  onExportAll: () => void
  onShortcutHelp: () => void
  theme: 'dark' | 'light' | 'system'
  onThemeToggle: () => void
  width?: number
  onResize?: (width: number) => void
}

export function Sidebar({
  onAddColor,
  onImagePick,
  onScreenPick,
  onVisualExport,
  onPaletteExport,
  onImport,
  onExportAll,
  onShortcutHelp,
  theme,
  onThemeToggle,
  width = 152,
  onResize,
}: SidebarProps) {
  const {
    activeSection,
    setActiveSection,
    activeFolderId,
    setActiveFolderId,
    activeTagId,
    setActiveTagId,
    setSelectedColorId,
    setIsDetailPanelOpen,
    searchQuery,
    setSearchQuery,
    searchFocusTrigger,
    activeMode,
    setActiveMode,
  } = useUIStore()
  const { colors } = useColorStore()
  const { historyColors, loadHistory, clearHistory } = useHistoryStore()

  useEffect(() => { loadHistory() }, [loadHistory])

  const [foldersOpen, setFoldersOpen] = useState(true)
  const [tagsOpen, setTagsOpen] = useState(true)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchFocusTrigger > 0) {
      setSearchExpanded(true)
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [searchFocusTrigger])

  useEffect(() => {
    if (searchExpanded) searchInputRef.current?.focus()
  }, [searchExpanded])

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!onResize) return
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    const onMove = (ev: MouseEvent) => onResize(Math.min(280, Math.max(120, startWidth + ev.clientX - startX)))
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const allCount = colors.filter((c) => !c.is_archived && !c.is_trashed).length
  const favCount  = colors.filter((c) => c.is_favorite && !c.is_archived && !c.is_trashed).length

  // ── グリッドアイテム定義 ──────────────────────────────────────────────────
  type GridCell =
    | { kind: 'nav';    Icon: PhosphorIcon; label: string; section: typeof activeSection }
    | { kind: 'action'; Icon: PhosphorIcon; label: string; onClick: () => void; isActive?: boolean }

  const grid: GridCell[] = [
    // 1段目：閲覧・生成
    { kind: 'nav',    Icon: IconSquaresFour, label: `すべての色 (${allCount})`, section: 'all' },
    { kind: 'nav',    Icon: IconStar,        label: `お気に入り (${favCount})`, section: 'favorites' },
    { kind: 'nav',    Icon: IconMagicWand,   label: 'カラージェネレーター',      section: 'generator' },
    // 2段目：取得・追加
    { kind: 'action', Icon: IconImageSquare, label: '画像から色を取得',           onClick: onImagePick },
    { kind: 'action', Icon: IconEyedropper,  label: 'スクリーンから色を取得',     onClick: onScreenPick },
    { kind: 'action', Icon: IconPlusCircle,  label: '色を追加',                   onClick: onAddColor },
    // 3段目：検証・設定
    { kind: 'nav',    Icon: IconLayout,      label: 'UIテスト',                   section: 'ui-test' },
    {
      kind: 'action',
      Icon: IconCircleHalf,
      label: 'コントラストチェッカー',
      isActive: activeMode === 'contrast',
      onClick: () => setActiveMode((activeMode === 'contrast' ? 'normal' : 'contrast') as ActiveMode),
    },
    {
      kind: 'action',
      Icon: IconSwatches,
      label: 'フィルター / 並び順',
      isActive: paletteOpen,
      onClick: () => setPaletteOpen((v) => !v),
    },
  ]

  // ── グリッドボタン共通スタイル ────────────────────────────────────────────
  const glassBase = [
    'flex items-center justify-center h-9 rounded-xl',
    'bg-white/5 border border-white/15 shadow-sm backdrop-blur-xl',
    // ease-spatial = cubic-bezier(0.16, 1, 0.3, 1) — スプリングライクな自然な動き
    'transition-all duration-200 ease-spatial',
    'hover:scale-110 active:scale-95',
  ].join(' ')

  // 座布団なし: bg/border 強調を除去 — アイコン色 + LED グローだけでアクティブを示す
  const glassActive = 'text-signature-blue sig-glow-active'

  const glassDefault = [
    'text-text-muted',
    'hover:text-text-primary hover:bg-white/10 hover:border-white/25',
    'hover:drop-shadow-[0_0_8px_rgba(37,99,235,0.40)]',
  ].join(' ')

  return (
    <div
      className="relative flex flex-col h-full"
      style={{ padding: '0.5rem 0.5rem 0' }}
    >
      {/* ── 検索 ── */}
      <div className="mb-2 flex-shrink-0">
        {searchExpanded ? (
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <IconMagnifyingGlass size={11} />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); setSearchExpanded(false) } }}
              onBlur={() => { if (!searchQuery) setSearchExpanded(false) }}
              placeholder="検索..."
              className="w-full pl-7 pr-6 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors text-[10px] leading-none"
              >✕</button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchExpanded(true)}
            title="検索 (⌘F)"
            className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
          >
            <IconMagnifyingGlass size={12} />
            <span className="text-[10px] opacity-40">⌘F</span>
            {searchQuery && (
              <span className="ml-auto text-[9px] bg-accent/20 text-accent-soft px-1.5 py-0.5 rounded-full">絞込中</span>
            )}
          </button>
        )}
      </div>

      {/* ── 3×3 Liquid Glass グリッド ── */}
      <div className="grid grid-cols-3 gap-1.5 mb-1 flex-shrink-0">
        {grid.map((cell, i) => {
          if (cell.kind === 'nav') {
            const isActive = activeSection === cell.section && !activeFolderId
            return (
              <button
                key={i}
                type="button"
                title={cell.label}
                onClick={() => setActiveSection(cell.section)}
                className={[glassBase, isActive ? glassActive : glassDefault].join(' ')}
              >
                <cell.Icon size={14} weight={isActive ? 'fill' : 'regular'} />
              </button>
            )
          }
          // action
          return (
            <button
              key={i}
              type="button"
              title={cell.label}
              onClick={cell.onClick}
              className={[
                glassBase,
                cell.isActive ? glassActive : glassDefault,
              ].join(' ')}
            >
              <cell.Icon size={14} weight={cell.isActive ? 'fill' : 'regular'} />
            </button>
          )
        })}
      </div>

      {/* ── パレット インライン展開 ── */}
      <AnimatePresence initial={false}>
        {paletteOpen && (
          <motion.div
            key="palette-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.5 }}
            className="overflow-hidden flex-shrink-0"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
              <PalettePanel
                onPaletteExport={onPaletteExport}
                onImport={onImport}
                onExportAll={onExportAll}
                onShortcutHelp={onShortcutHelp}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── スクロール可能な中央エリア ── */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-4 pt-2 pb-2">

        {/* フォルダ */}
        <div>
          <button
            type="button"
            onClick={() => setFoldersOpen((v) => !v)}
            className="flex items-center gap-1 w-full px-1 mb-1 text-text-muted hover:text-text-primary transition-colors"
          >
            <span className={['transition-transform duration-150', foldersOpen ? 'rotate-90' : ''].join(' ')}>
              <IconCaretRight size={10} />
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-widest flex items-center gap-1">
              <IconFolder size={9} />フォルダ
            </span>
          </button>
          {foldersOpen && <FolderList activeFolderId={activeFolderId} onSelectFolder={setActiveFolderId} />}
        </div>

        {/* タグ */}
        <div>
          <button
            type="button"
            onClick={() => setTagsOpen((v) => !v)}
            className="flex items-center gap-1 w-full px-1 mb-1 text-text-muted hover:text-text-primary transition-colors"
          >
            <span className={['transition-transform duration-150', tagsOpen ? 'rotate-90' : ''].join(' ')}>
              <IconCaretRight size={10} />
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-widest flex items-center gap-1">
              <IconTag size={9} />タグ
            </span>
          </button>
          {tagsOpen && (
            <TagList
              activeTagId={activeTagId}
              onSelectTag={(id) => setActiveTagId(activeTagId === id ? null : id)}
            />
          )}
        </div>

        {/* 最近の色（ミニマルドット） */}
        {historyColors.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">最近</span>
              <button
                type="button"
                onClick={clearHistory}
                className="text-[9px] text-text-muted hover:text-text-primary transition-colors"
              >クリア</button>
            </div>
            <div className="flex flex-row flex-wrap gap-1.5 px-1">
              {historyColors.slice(0, 20).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.hex}
                  onClick={() => {
                    setActiveSection('all')
                    setTimeout(() => {
                      const el = document.querySelector(`[data-color-id="${c.id}"]`)
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        setSelectedColorId(c.id)
                        setIsDetailPanelOpen(true)
                      }
                    }, 80)
                  }}
                  className="w-5 h-5 rounded-full flex-shrink-0 hover:scale-110 transition-transform border border-white/10"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── ボトムドック ── */}
      <div className="flex-shrink-0 flex items-center justify-around py-1.5 border-t border-white/6">
        <button
          type="button"
          title="ゴミ箱"
          onClick={() => setActiveSection('trash')}
          className={[
            'flex items-center justify-center w-8 h-8 rounded-xl transition-all ease-spatial duration-200 tactile',
            activeSection === 'trash' && !activeFolderId
              ? 'text-signature-blue sig-glow-active'
              : 'text-text-muted hover:text-text-primary hover:bg-white/8 hover:drop-shadow-[0_0_8px_rgba(37,99,235,0.35)]',
          ].join(' ')}
        >
          <IconTrash size={14} weight={activeSection === 'trash' && !activeFolderId ? 'fill' : 'regular'} />
        </button>

        <button
          type="button"
          title="ビジュアル書き出し"
          onClick={onVisualExport}
          className="flex items-center justify-center w-8 h-8 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/8 transition-all tactile"
        >
          <IconDownloadSimple size={14} />
        </button>

        <button
          type="button"
          title={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
          onClick={onThemeToggle}
          className="flex items-center justify-center w-8 h-8 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/8 transition-all tactile"
        >
          {theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
        </button>
      </div>

      {/* リサイザー */}
      {onResize && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize opacity-0 hover:opacity-100 hover:bg-accent/40 transition-opacity"
          title="ドラッグで幅を調整"
        />
      )}
    </div>
  )
}
