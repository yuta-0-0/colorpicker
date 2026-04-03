import { ColorSwatch } from './ColorSwatch'
import type { Color } from '@/types/database'

interface ColorGalleryItemProps {
  color: Color
  isSelected: boolean
  onSelect: () => void
}

export function ColorGalleryItem({ color, isSelected, onSelect }: ColorGalleryItemProps) {
  return (
    <div onClick={onSelect} className="flex flex-col items-center gap-1.5 cursor-pointer group" title={`${color.name}\n${color.hex}`}>
      <ColorSwatch hex={color.hex} alpha={color.alpha} size="md" isSelected={isSelected} className={color.is_archived ? 'opacity-40' : ''} />
      <p className="text-xs text-text-muted font-mono truncate w-14 text-center">{color.hex}</p>
    </div>
  )
}
