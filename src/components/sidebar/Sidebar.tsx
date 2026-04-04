import { useState } from 'react'
import { SearchBar } from './SearchBar'
import { NavItem } from './NavItem'
import { FolderList } from './FolderList'
import { TagList } from './TagList'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import type { NavSection } from '@/store/uiStore'

export function Sidebar() {
  const [activeTagId, setActiveTagId] = useState<string | null>(null)
  const { activeSection, setActiveSection, activeFolderId, setActiveFolderId } = useUIStore()
  const { colors } = useColorStore()

  const allCount = colors.filter((c) => !c.is_archived).length
  const favoriteCount = colors.filter((c) => c.is_favorite && !c.is_archived).length

  const navItems: { id: NavSection; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'all', label: 'すべての色', icon: '◉', count: allCount },
    { id: 'favorites', label: 'お気に入り', icon: '★', count: favoriteCount },
    { id: 'history', label: '最近使った色', icon: '⏱' },
    { id: 'generator', label: 'カラージェネレーター', icon: '✦' },
  ]

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col gap-5 px-3 py-4 bg-surface border-r border-border overflow-y-auto h-full">
      <SearchBar />

      <nav className="space-y-0.5">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeSection === item.id && !activeFolderId}
            count={item.count}
            onClick={() => setActiveSection(item.id)}
          />
        ))}
      </nav>

      <div>
        <p className="px-2.5 mb-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">フォルダ</p>
        <FolderList activeFolderId={activeFolderId} onSelectFolder={setActiveFolderId} />
      </div>

      <div>
        <p className="px-2.5 mb-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">タグ</p>
        <TagList activeTagId={activeTagId} onSelectTag={setActiveTagId} />
      </div>
    </aside>
  )
}
