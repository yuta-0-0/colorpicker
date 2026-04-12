import { useUIStore, type ToneCategory } from '@/store/uiStore'
import { IconSortAsc, IconSortDesc } from '@/components/ui/Icons'

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

const SORT_OPTIONS = [
  { value: 'order', label: '追加順' },
  { value: 'hue', label: '色相順' },
  { value: 'used_count', label: 'よく使う順' },
] as const

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

  const handleHueClick = (label: string) => {
    setActiveHueFilter(activeHueFilter === label ? null : label)
  }

  return (
    <div className="flex items-center border-b border-border flex-shrink-0 overflow-hidden">
      {/* 左：スクロール可能なフィルター群 */}
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto flex-1 min-w-0">
        {/* 色相フィルター（ドットのみ） */}
        {HUE_FILTERS.map((filter) => {
          const isActive = activeHueFilter === filter.label
          return (
            <button
              key={filter.label}
              type="button"
              title={filter.label}
              onClick={() => handleHueClick(filter.label)}
              className={[
                'flex items-center justify-center w-6 h-6 rounded-full transition-all flex-shrink-0',
                isActive
                  ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface scale-110'
                  : 'hover:scale-110 opacity-70 hover:opacity-100',
              ].join(' ')}
            >
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: filter.hex }} />
            </button>
          )
        })}

        <div className="w-px h-4 bg-border flex-shrink-0 mx-0.5" />

        {/* トーンフィルター */}
        {TONE_FILTERS.map((tone) => {
          const isActive = activeToneFilter === tone.value
          return (
            <button
              key={tone.value}
              type="button"
              onClick={() => setActiveToneFilter(activeToneFilter === tone.value ? null : tone.value)}
              className={[
                'px-2 py-1 rounded-full text-xs transition-colors flex-shrink-0',
                isActive
                  ? 'bg-accent/10 text-accent-soft border border-accent glow-accent-sm font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay border border-transparent',
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
            'px-2 py-1 rounded-full text-xs transition-colors flex-shrink-0',
            activeTraditionalFilter
              ? 'bg-accent/10 text-accent-soft border border-accent glow-accent-sm font-medium'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay border border-transparent',
          ].join(' ')}
        >
          伝統色
        </button>
      </div>

      {/* 右：固定のソートコントロール */}
      <div className="flex items-center gap-1 px-3 py-2 border-l border-border flex-shrink-0">
        {/* アーカイブ */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          type="button"
          className={[
            'px-2 py-1 rounded text-xs transition-colors',
            showArchived
              ? 'bg-accent/10 text-accent-soft font-medium'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-overlay',
          ].join(' ')}
        >
          {showArchived ? 'アーカイブ表示中' : 'アーカイブ'}
        </button>

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* 並び順グループ */}
        <span className="text-[10px] text-text-muted mr-0.5 tracking-wide">並び順</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            type="button"
            className={[
              'px-2 py-1 rounded text-xs transition-colors',
              sortBy === opt.value
                ? 'bg-accent/10 text-accent-soft font-medium'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-overlay',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={toggleSortDirection}
          type="button"
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
          title={sortDirection === 'asc' ? '昇順 → 降順に変更' : '降順 → 昇順に変更'}
        >
          {sortDirection === 'asc' ? <IconSortAsc size={13} /> : <IconSortDesc size={13} />}
        </button>
      </div>
    </div>
  )
}
