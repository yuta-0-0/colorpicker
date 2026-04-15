/**
 * FolderIconPicker — フォルダアイコン選択ポップオーバー（lucide-react ベクターアイコン版）
 */
import {
  Folder, FolderOpen, Star, Heart, Bookmark, Tag, Palette,
  Image, Film, Music, Camera, Coffee, Zap, Globe, Home,
  Briefcase, Archive, Book, Package, Layers, Grid3x3,
  Feather, Leaf, Sun, Moon, Cloud, Umbrella, Diamond, Crown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface IconEntry { key: string; Icon: LucideIcon }

const ICON_OPTIONS: IconEntry[] = [
  { key: 'Folder',    Icon: Folder },
  { key: 'FolderOpen', Icon: FolderOpen },
  { key: 'Star',      Icon: Star },
  { key: 'Heart',     Icon: Heart },
  { key: 'Bookmark',  Icon: Bookmark },
  { key: 'Tag',       Icon: Tag },
  { key: 'Palette',   Icon: Palette },
  { key: 'Image',     Icon: Image },
  { key: 'Film',      Icon: Film },
  { key: 'Music',     Icon: Music },
  { key: 'Camera',    Icon: Camera },
  { key: 'Coffee',    Icon: Coffee },
  { key: 'Zap',       Icon: Zap },
  { key: 'Globe',     Icon: Globe },
  { key: 'Home',      Icon: Home },
  { key: 'Briefcase', Icon: Briefcase },
  { key: 'Archive',   Icon: Archive },
  { key: 'Book',      Icon: Book },
  { key: 'Package',   Icon: Package },
  { key: 'Layers',    Icon: Layers },
  { key: 'Grid3x3',   Icon: Grid3x3 },
  { key: 'Feather',   Icon: Feather },
  { key: 'Leaf',      Icon: Leaf },
  { key: 'Sun',       Icon: Sun },
  { key: 'Moon',      Icon: Moon },
  { key: 'Cloud',     Icon: Cloud },
  { key: 'Umbrella',  Icon: Umbrella },
  { key: 'Diamond',   Icon: Diamond },
  { key: 'Crown',     Icon: Crown },
]

interface FolderIconPickerProps {
  currentIcon: string | null
  onSelect: (icon: string) => void
  onClose: () => void
}

export function FolderIconPicker({ currentIcon, onSelect, onClose }: FolderIconPickerProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute left-0 top-full mt-1 z-50 glass-popup rounded-xl p-2"
        style={{ width: 192 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs text-text-muted px-1 pb-1.5">アイコンを選択</p>
        <div className="grid grid-cols-6 gap-0.5">
          {ICON_OPTIONS.map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => { onSelect(key); onClose() }}
              className={[
                'w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-text-secondary hover:text-text-primary hover:bg-surface-overlay',
                currentIcon === key ? 'bg-accent/20 text-accent-soft ring-1 ring-accent/40' : '',
              ].join(' ')}
              title={key}
            >
              <Icon size={14} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

/** アイコンキーから lucide コンポーネントを返す（FolderList 等で使用） */
export function FolderIconComponent({ iconKey, size = 13 }: { iconKey: string | null; size?: number }) {
  const entry = ICON_OPTIONS.find((e) => e.key === iconKey)
  const Icon = entry?.Icon ?? Folder
  return <Icon size={size} strokeWidth={1.5} />
}
