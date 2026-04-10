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
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border overflow-x-auto flex-shrink-0">
      {HUE_FILTERS.map((filter) => {
        const isActive = activeHueFilter === filter.label
        return (
          <button
            key={filter.label}
            type="button"
            onClick={() => handleHueClick(filter.label)}
            className={[
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors flex-shrink-0',
              isActive
                ? 'bg-accent/10 text-accent-soft border border-accent glow-accent-sm font-medium'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay border border-transparent',
            ].join(' ')}
          >
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: filter.hex }} />
            {filter.label}
          </button>
        )
      })}

      {/* セパレーター */}
      <div className="w-px h-4 bg-border flex-shrink-0" />

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
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors flex-shrink-0',
          activeTraditionalFilter
            ? 'bg-accent/10 text-accent-soft border border-accent glow-accent-sm font-medium'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay border border-transparent',
        ].join(' ')}
      >
        伝統色
      </button>

      <div className="ml-auto flex-shrink-0 flex items-center gap-1">
        {/* ソート選択 */}
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            type="button"
            className={[
              'px-2 py-1 rounded-full text-xs transition-colors',
              sortBy === opt.value
                ? 'bg-accent/10 text-accent-soft border border-accent glow-accent-sm font-medium'
                : 'text-text-muted hover:text-text-secondary border border-transparent',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}

        {/* 昇降切り替え */}
        <button
          onClick={toggleSortDirection}
          type="button"
          className="px-1.5 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
          title={sortDirection === 'asc' ? '昇順（降順に変更）' : '降順（昇順に変更）'}
        >
          {sortDirection === 'asc' ? <IconSortAsc size={14} /> : <IconSortDesc size={14} />}
        </button>

        {/* アーカイブ表示 */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          type="button"
          className={[
            'px-2 py-1 rounded-full text-xs transition-colors',
            showArchived
              ? 'bg-accent/10 text-accent-soft border border-accent glow-accent-sm font-medium'
              : 'text-text-muted hover:text-text-secondary border border-transparent',
          ].join(' ')}
        >
          アーカイブ {showArchived ? '非表示' : '表示'}
        </button>
      </div>
    </div>
  )
}
