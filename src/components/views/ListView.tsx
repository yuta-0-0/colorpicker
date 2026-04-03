import { ColorListItem } from '@/components/color/ColorListItem'
import { useUIStore } from '@/store/uiStore'
import type { Color } from '@/types/database'

interface ListViewProps { colors: Color[] }

export function ListView({ colors }: ListViewProps) {
  const { selectedColorId, setSelectedColorId, showArchived } = useUIStore()
  const visibleColors = showArchived ? colors : colors.filter((c) => !c.is_archived)

  if (visibleColors.length === 0) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-text-muted text-sm">色がありません</p></div>
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {visibleColors.map((color) => (
        <ColorListItem
          key={color.id}
          color={color}
          isSelected={selectedColorId === color.id}
          onSelect={() => setSelectedColorId(color.id)}
          onCopy={(e) => { e.stopPropagation(); navigator.clipboard.writeText(color.hex) }}
          onToggleFavorite={(e) => { e.stopPropagation(); console.log('toggle favorite:', color.id) }}
          onDelete={(e) => { e.stopPropagation(); console.log('delete:', color.id) }}
        />
      ))}
    </div>
  )
}
