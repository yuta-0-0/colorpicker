import type { Color } from '@/types/database'

interface ColorGalleryItemProps {
  color: Color
  isSelected: boolean
  onSelect: () => void
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function ColorGalleryItem({ color, isSelected, onSelect }: ColorGalleryItemProps) {
  const hasTransparency = color.alpha < 1.0
  const rgbaColor = hexToRgba(color.hex, color.alpha)

  return (
    <div
      onClick={onSelect}
      className={['flex flex-col items-center gap-1.5 cursor-pointer group', color.is_archived ? 'opacity-40' : ''].join(' ')}
      title={`${color.name}\n${color.hex}`}
    >
      {/* 丸チップ */}
      <div
        className={[
          'relative w-12 h-12 rounded-full flex-shrink-0 overflow-hidden chip-border transition-all',
          isSelected ? 'ring-selection' : 'border-white/20',
        ].join(' ')}
      >
        {/* 透明度チェッカー */}
        {hasTransparency && (
          <span
            className="absolute inset-0"
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
        {/* カラー塗り */}
        <span className="absolute inset-0" style={{ backgroundColor: rgbaColor }} />
      </div>

      <p className="text-[10px] text-text-muted font-mono truncate w-14 text-center leading-none">{color.hex}</p>
    </div>
  )
}
