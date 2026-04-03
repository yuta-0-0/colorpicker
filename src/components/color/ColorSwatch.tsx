interface ColorSwatchProps {
  hex: string
  alpha?: number
  size?: 'sm' | 'md' | 'lg'
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

const SIZE_MAP = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function ColorSwatch({
  hex,
  alpha = 1.0,
  size = 'sm',
  isSelected = false,
  onClick,
  className = '',
}: ColorSwatchProps) {
  const hasTransparency = alpha < 1.0
  const rgbaColor = hexToRgba(hex, alpha)

  return (
    <button
      onClick={onClick}
      className={[
        'relative rounded-full flex-shrink-0 transition-transform',
        SIZE_MAP[size],
        onClick ? 'cursor-pointer hover:scale-105' : 'cursor-default',
        isSelected ? 'ring-2 ring-offset-2 ring-offset-surface ring-accent' : '',
        className,
      ].join(' ')}
      style={{ outline: 'none' }}
      type="button"
    >
      {hasTransparency && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #555 25%, transparent 25%),
              linear-gradient(-45deg, #555 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #555 75%),
              linear-gradient(-45deg, transparent 75%, #555 75%)
            `,
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
          }}
        />
      )}
      <span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: rgbaColor }}
      />
    </button>
  )
}
