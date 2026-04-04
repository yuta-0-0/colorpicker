import { ColorGalleryItem } from '@/components/color/ColorGalleryItem'
import { useUIStore } from '@/store/uiStore'
import type { Color } from '@/types/database'

function getHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  if (d === 0) return 0
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return Math.round(h * 60 + (h < 0 ? 360 : 0))
}

interface GalleryViewProps { colors: Color[] }

export function GalleryView({ colors }: GalleryViewProps) {
  const { selectedColorId, setSelectedColorId, showArchived, bulkSelectedIds, toggleBulkSelect, isBulkMode } = useUIStore()

  const visibleColors = (showArchived ? colors : colors.filter((c) => !c.is_archived))
    .slice().sort((a, b) => getHue(a.hex) - getHue(b.hex))

  if (visibleColors.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted text-sm">色がありません</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-wrap gap-4">
        {visibleColors.map((color) => {
          const isChecked = bulkSelectedIds.includes(color.id)
          return (
            <div key={color.id} className="relative group/gallery">
              <ColorGalleryItem
                color={color}
                isSelected={selectedColorId === color.id}
                onSelect={() => setSelectedColorId(color.id)}
              />
              {/* チェックボックス：バルクモード中は常時表示、それ以外はホバー時のみ */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleBulkSelect(color.id) }}
                className={[
                  'absolute top-0 right-0 w-4 h-4 rounded flex items-center justify-center transition-opacity',
                  isBulkMode
                    ? 'opacity-100'
                    : 'opacity-0 group-hover/gallery:opacity-100',
                  isChecked
                    ? 'bg-accent text-white'
                    : 'bg-surface-overlay border border-border text-transparent',
                ].join(' ')}
                title="選択"
              >
                {isChecked && (
                  <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
