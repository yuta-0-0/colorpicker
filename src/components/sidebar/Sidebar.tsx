import React, { useEffect } from 'react'
import { SearchBar } from './SearchBar'
import { NavItem } from './NavItem'
import { FolderList } from './FolderList'
import { TagList } from './TagList'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useHistoryStore } from '@/store/historyStore'
import type { NavSection } from '@/store/uiStore'

export function Sidebar() {
  const { activeSection, setActiveSection, activeFolderId, setActiveFolderId, activeTagId, setActiveTagId } = useUIStore()
  const { colors } = useColorStore()
  const { historyColors, loadHistory, clearHistory } = useHistoryStore()

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const allCount = colors.filter((c) => !c.is_archived).length
  const favoriteCount = colors.filter((c) => c.is_favorite && !c.is_archived).length

  const navItems: { id: NavSection; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'all', label: 'すべての色', icon: '◉', count: allCount },
    { id: 'favorites', label: 'お気に入り', icon: '★', count: favoriteCount },
    { id: 'history', label: '最近使った色', icon: '⏱' },
    { id: 'generator', label: 'カラージェネレーター', icon: '✦' },
  ]

  const handleSelectTag = (id: string) => {
    // 同じタグをクリックでトグル解除
    setActiveTagId(activeTagId === id ? null : id)
  }

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
        <TagList activeTagId={activeTagId} onSelectTag={handleSelectTag} />
      </div>

      {/* 履歴 */}
      <div>
        <div className="flex items-center justify-between px-2.5 mb-1.5">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">最近の色</p>
          {historyColors.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              クリア
            </button>
          )}
        </div>
        {historyColors.length === 0 ? (
          <p className="px-2.5 text-xs text-text-muted">履歴はありません</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 px-1">
            {historyColors.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.hex}
                onClick={() => setActiveSection('history')}
                className="hover:scale-110 transition-transform"
              >
                <ColorSwatch hex={c.hex} alpha={c.alpha} size="sm" />
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
