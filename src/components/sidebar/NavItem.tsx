import type { ReactNode } from 'react'

interface NavItemProps {
  label: string
  icon: ReactNode
  isActive?: boolean
  count?: number
  onClick: () => void
}

export function NavItem({ label, icon, isActive = false, count, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={[
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left',
        isActive
          ? 'bg-accent text-white glow-accent'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay/50',
      ].join(' ')}
    >
      <span className="text-base w-4 flex-shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-text-muted tabular-nums">{count}</span>
      )}
    </button>
  )
}
