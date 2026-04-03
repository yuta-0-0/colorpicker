import { useUIStore } from '@/store/uiStore'

const HUE_FILTERS = [
  { label: '赤', hex: '#ef4444' },
  { label: '橙', hex: '#f97316' },
  { label: '黄', hex: '#eab308' },
  { label: '緑', hex: '#22c55e' },
  { label: '青', hex: '#3b82f6' },
  { label: '紫', hex: '#a855f7' },
  { label: 'ピンク', hex: '#ec4899' },
  { label: '無彩色', hex: '#888888' },
]

export function FilterBar() {
  const { showArchived, setShowArchived } = useUIStore()
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border overflow-x-auto flex-shrink-0">
      {HUE_FILTERS.map((filter) => (
        <button key={filter.label} type="button" className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors flex-shrink-0">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: filter.hex }} />
          {filter.label}
        </button>
      ))}
      <div className="ml-auto flex-shrink-0">
        <button onClick={() => setShowArchived(!showArchived)} type="button" className={['px-2 py-1 rounded-full text-xs transition-colors', showArchived ? 'bg-surface-overlay text-text-primary' : 'text-text-muted hover:text-text-secondary'].join(' ')}>
          アーカイブ {showArchived ? '非表示' : '表示'}
        </button>
      </div>
    </div>
  )
}
