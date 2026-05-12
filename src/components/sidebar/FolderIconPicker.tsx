/**
 * FolderIconPicker — フォルダアイコン選択ポップオーバー（@phosphor-icons/react 版）
 */
import {
  FolderSimple, FolderOpen, Star, Heart, Bookmark, Tag, Palette,
  ImageSquare, FilmStrip, MusicNote, Camera, Coffee, Lightning, Globe, House,
  Briefcase, Archive, Book, Package, Stack, GridNine,
  Feather, Leaf, Sun, Moon, Cloud, Umbrella, Diamond, Crown,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

interface IconEntry { key: string; Icon: PhosphorIcon }

const ICON_OPTIONS: IconEntry[] = [
  { key: 'FolderSimple', Icon: FolderSimple },
  { key: 'FolderOpen',   Icon: FolderOpen },
  { key: 'Star',         Icon: Star },
  { key: 'Heart',        Icon: Heart },
  { key: 'Bookmark',     Icon: Bookmark },
  { key: 'Tag',          Icon: Tag },
  { key: 'Palette',      Icon: Palette },
  { key: 'ImageSquare',  Icon: ImageSquare },
  { key: 'FilmStrip',    Icon: FilmStrip },
  { key: 'MusicNote',    Icon: MusicNote },
  { key: 'Camera',       Icon: Camera },
  { key: 'Coffee',       Icon: Coffee },
  { key: 'Lightning',    Icon: Lightning },
  { key: 'Globe',        Icon: Globe },
  { key: 'House',        Icon: House },
  { key: 'Briefcase',    Icon: Briefcase },
  { key: 'Archive',      Icon: Archive },
  { key: 'Book',         Icon: Book },
  { key: 'Package',      Icon: Package },
  { key: 'Stack',        Icon: Stack },
  { key: 'GridNine',     Icon: GridNine },
  { key: 'Feather',      Icon: Feather },
  { key: 'Leaf',         Icon: Leaf },
  { key: 'Sun',          Icon: Sun },
  { key: 'Moon',         Icon: Moon },
  { key: 'Cloud',        Icon: Cloud },
  { key: 'Umbrella',     Icon: Umbrella },
  { key: 'Diamond',      Icon: Diamond },
  { key: 'Crown',        Icon: Crown },
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
              <Icon size={14} weight="regular" />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

/** アイコンキーから Phosphor コンポーネントを返す（FolderList 等で使用） */
export function FolderIconComponent({ iconKey, size = 13 }: { iconKey: string | null; size?: number }) {
  const entry = ICON_OPTIONS.find((e) => e.key === iconKey)
  const Icon = entry?.Icon ?? FolderSimple
  return <Icon size={size} weight="regular" />
}
