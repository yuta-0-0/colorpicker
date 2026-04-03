import { ColorSwatch } from './ColorSwatch'
import { IconButton } from '@/components/ui/IconButton'
import type { Color } from '@/types/database'

interface ColorListItemProps {
  color: Color
  isSelected: boolean
  onSelect: () => void
  onCopy: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}

export function ColorListItem({ color, isSelected, onSelect, onCopy, onToggleFavorite, onDelete }: ColorListItemProps) {
  return (
    <div
      onClick={onSelect}
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors group',
        isSelected ? 'bg-surface-overlay' : 'hover:bg-surface-raised',
        color.is_archived ? 'opacity-40' : '',
      ].join(' ')}
    >
      <ColorSwatch hex={color.hex} alpha={color.alpha} size="sm" isSelected={isSelected} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{color.name || color.hex}</p>
        <p className="text-xs text-text-muted font-mono">{color.hex}</p>
      </div>
      {color.is_locked && <span className="text-xs text-text-muted" title="ロック中">🔒</span>}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton onClick={onCopy} title="コピー">⎘</IconButton>
        <IconButton onClick={onToggleFavorite} title={color.is_favorite ? 'お気に入り解除' : 'お気に入り'} active={color.is_favorite}>
          {color.is_favorite ? '★' : '☆'}
        </IconButton>
        <IconButton onClick={onDelete} title="削除" danger disabled={color.is_locked}>✕</IconButton>
      </div>
    </div>
  )
}
