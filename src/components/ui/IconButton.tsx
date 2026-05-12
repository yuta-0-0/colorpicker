import type { ReactNode } from 'react'

interface IconButtonProps {
  onClick?: (e: React.MouseEvent) => void
  title?: string
  disabled?: boolean
  active?: boolean
  danger?: boolean
  children: ReactNode
  className?: string
}

export function IconButton({
  onClick,
  title,
  disabled = false,
  active = false,
  danger = false,
  children,
  className = '',
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      type="button"
      className={[
        'w-7 h-7 flex items-center justify-center rounded-md transition-colors text-sm tactile',
        disabled
          ? 'opacity-30 cursor-not-allowed text-text-muted'
          : danger
          ? 'text-text-muted hover:text-danger hover:bg-danger/10'
          : active
          ? 'text-accent bg-accent/10 hover:text-accent'
          : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
