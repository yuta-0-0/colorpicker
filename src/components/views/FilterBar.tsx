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
  { label: '赤', hex: '#ef4444' },
  { label: '橙', hex: '#f97316' },
  { label: '黄', hex: '#eab308' },
  { label: '緑', hex: '#22c55e' },
  { label: '青', hex: '#3b82f6' },
  { label: '紫', hex: '#a855f7' },
  { label: 'ピンク', hex: '#ec4899' },
  { label: '白', hex: '#f0f0f0' },
  { label: 'グレー', hex: '#888888' },
  { label: '黒', hex: '#222222' },
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

export function FilterBar() {
  const {
    showArchived,
    setShowArchived,
    activeHueFilter,
    setActiveHueFilter,
    sortBy,
    setSortBy,
    sortDirection,
    toggleSortDirection,
    activeTraditionalFilter,
    setActiveTraditionalFilter,
    activeToneFilter,
    setActiveToneFilter,
  } = useUIStore()

  return (
    <div className="flex items-stretch flex-shrink-0 overflow-hidden h-9 border-b border-white/5">
      {/* 左：スクロール可能なフィルター群（scrollbar-hide） */}
      <div className="flex items-center gap-1 px-2 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
        {/* 色相フィルター（ドットのみ） */}
        {HUE_FILTERS.map((filter) => {
          const isActive = activeHueFilter === filter.label
          return (
            <button
              key={filter.label}
              type="button"
              title={filter.label}
              onClick={() => setActiveHueFilter(activeHueFilter === filter.label ? null : filter.label)}
              className={[
                'flex items-center justify-center w-5 h-5 rounded-full transition-all flex-shrink-0',
                isActive
                  ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface scale-110'
                  : 'hover:scale-110 opacity-60 hover:opacity-100',
              ].join(' ')}
            >
              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: filter.hex }} />
            </button>
          )
        })}

        <div className="w-px h-3 bg-border/10 flex-shrink-0 mx-0.5" />

        {/* トーンフィルター */}
        {TONE_FILTERS.map((tone) => {
          const isActive = activeToneFilter === tone.value
          return (
            <button
              key={tone.value}
              type="button"
              onClick={() => setActiveToneFilter(activeToneFilter === tone.value ? null : tone.value)}
              className={[
                'px-1.5 py-0.5 rounded text-[10px] transition-colors flex-shrink-0 leading-none tactile',
                isActive
                  ? 'bg-accent/15 text-accent-soft font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/5',
              ].join(' ')}
            >
              {tone.label}
            </button>
          )
        })}

        {/* 伝統色フィルター */}
        <button
          type="button"
          onClick={() => setActiveTraditionalFilter(!activeTraditionalFilter)}
          className={[
            'px-1.5 py-0.5 rounded text-[10px] transition-colors flex-shrink-0 leading-none tactile',
            activeTraditionalFilter
              ? 'bg-accent/15 text-accent-soft font-medium'
              : 'text-text-muted hover:text-text-secondary hover:bg-white/5',
          ].join(' ')}
        >
          伝統色
        </button>
      </div>

      {/* 右：固定のソートコントロール */}
      <div className="flex items-center gap-0.5 px-2 border-l border-white/5 flex-shrink-0">
        {/* アーカイブ */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          type="button"
          title={showArchived ? 'アーカイブを非表示' : 'アーカイブを表示'}
          className={[
            'flex items-center justify-center w-7 h-7 rounded transition-colors tactile',
            showArchived
              ? 'text-accent-soft bg-accent/10'
              : 'text-text-muted hover:text-text-secondary hover:bg-white/5',
          ].join(' ')}
        >
          <IconArchive size={11} weight={showArchived ? 'fill' : 'regular'} />
        </button>

        <div className="w-px h-3 bg-border/10 mx-0.5" />

        {/* 並び順：アイコンのみ */}
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            type="button"
            title={opt.label}
            className={[
              'flex items-center justify-center w-7 h-7 rounded transition-colors tactile',
              sortBy === opt.value
                ? 'text-accent-soft bg-accent/10'
                : 'text-text-muted hover:text-text-secondary hover:bg-white/5',
            ].join(' ')}
          >
            <opt.Icon size={12} weight={sortBy === opt.value ? 'fill' : 'regular'} />
          </button>
        ))}

        {/* ソート方向（アイコンのみ） */}
        <button
          onClick={toggleSortDirection}
          type="button"
          title={sortDirection === 'asc' ? '昇順' : '降順'}
          className="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors tactile"
        >
          {sortDirection === 'asc' ? <IconSortAsc size={11} /> : <IconSortDesc size={11} />}
        </button>
      </div>
    </div>
  )
}
