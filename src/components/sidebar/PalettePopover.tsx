import { useEffect, useRef } from 'react'
import { useUIStore, type ToneCategory } from '@/store/uiStore'
import {
  IconArchive,
  IconClock,
  IconPalette,
  IconTrendUp,
  IconSortAsc,
  IconSortDesc,
  type PhosphorIcon,
} from '@/components/ui/Icons'

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

interface PalettePopoverProps {
  anchorRect: DOMRect
  onClose: () => void
  onPaletteExport: () => void
  onImport: () => void
  onExportAll: () => void
  onShortcutHelp: () => void
}

export function PalettePopover({
  anchorRect,
  onClose,
  onPaletteExport,
  onImport,
  onExportAll,
  onShortcutHelp,
}: PalettePopoverProps) {
  const {
    showArchived, setShowArchived,
    activeHueFilter, setActiveHueFilter,
    sortBy, setSortBy,
    sortDirection, toggleSortDirection,
    activeTraditionalFilter, setActiveTraditionalFilter,
    activeToneFilter, setActiveToneFilter,
  } = useUIStore()

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // setTimeout で開くクリック自体に反応しないようにする
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="glass-popup rounded-xl overflow-hidden"
      style={{
        position: 'fixed',
        left: anchorRect.right + 8,
        top: Math.min(anchorRect.top, window.innerHeight - 380),
        width: 236,
        zIndex: 200,
      }}
    >
      <div className="p-3 space-y-3">

        {/* ── 色相 ── */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted mb-2">色相</p>
          <div className="flex flex-wrap gap-1.5">
            {HUE_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                title={f.label}
                onClick={() => setActiveHueFilter(activeHueFilter === f.label ? null : f.label)}
                className={[
                  'w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0',
                  activeHueFilter === f.label
                    ? 'ring-2 ring-accent ring-offset-1 ring-offset-[rgb(var(--color-surface))] scale-110'
                    : 'opacity-70 hover:opacity-100 hover:scale-110',
                ].join(' ')}
              >
                <span className="w-3.5 h-3.5 rounded-full block" style={{ backgroundColor: f.hex }} />
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/6" />

        {/* ── トーン ── */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted mb-2">トーン</p>
          <div className="flex flex-wrap gap-1">
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

        <div className="h-px bg-white/6" />

        {/* ── 並び順 ── */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted mb-2">並び順</p>
          <div className="flex items-center gap-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                title={opt.label}
                onClick={() => setSortBy(opt.value)}
                className={[
                  'flex items-center justify-center w-7 h-7 rounded transition-colors',
                  sortBy === opt.value
                    ? 'bg-accent/15 text-accent-soft'
                    : 'text-text-muted hover:text-text-secondary hover:bg-white/8',
                ].join(' ')}
              >
                <opt.Icon size={12} weight={sortBy === opt.value ? 'fill' : 'regular'} />
              </button>
            ))}
            <button
              type="button"
              title={sortDirection === 'asc' ? '昇順' : '降順'}
              onClick={toggleSortDirection}
              className="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text-secondary hover:bg-white/8 transition-colors"
            >
              {sortDirection === 'asc' ? <IconSortAsc size={11} /> : <IconSortDesc size={11} />}
            </button>
            <div className="flex-1" />
            {/* アーカイブ */}
            <button
              type="button"
              title={showArchived ? 'アーカイブを非表示' : 'アーカイブを表示'}
              onClick={() => setShowArchived(!showArchived)}
              className={[
                'flex items-center justify-center w-7 h-7 rounded transition-colors',
                showArchived
                  ? 'bg-accent/15 text-accent-soft'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/8',
              ].join(' ')}
            >
              <IconArchive size={11} weight={showArchived ? 'fill' : 'regular'} />
            </button>
          </div>
        </div>

        <div className="h-px bg-white/6" />

        {/* ── エクスポート / インポート ── */}
        <div className="-mx-1">
          {([
            { label: 'パレット書き出し',      onClick: onPaletteExport },
            { label: 'インポート',            onClick: onImport },
            { label: '全データをバックアップ', onClick: onExportAll },
            { label: 'ショートカット一覧 (?)', onClick: onShortcutHelp },
          ] as const).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { item.onClick(); onClose() }}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-white/8 hover:text-text-primary transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
