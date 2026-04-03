import type { ViewMode } from '@/store/uiStore'

interface ViewToggleProps {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-surface-overlay rounded-lg p-0.5">
      <button onClick={() => onChange('list')} type="button" className={['px-3 py-1 rounded-md text-sm transition-colors', mode === 'list' ? 'bg-surface-raised text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'].join(' ')}>リスト</button>
      <button onClick={() => onChange('gallery')} type="button" className={['px-3 py-1 rounded-md text-sm transition-colors', mode === 'gallery' ? 'bg-surface-raised text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'].join(' ')}>ギャラリー</button>
    </div>
  )
}
