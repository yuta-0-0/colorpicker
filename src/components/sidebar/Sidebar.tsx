import React, { useEffect, useState } from 'react'
import { SearchBar } from './SearchBar'
import { NavItem } from './NavItem'
import { FolderList } from './FolderList'
import { TagList } from './TagList'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useHistoryStore } from '@/store/historyStore'
import type { NavSection } from '@/store/uiStore'
import {
  IconGrid,
  IconStar,
  IconClock,
  IconSparkle,
  IconMonitor,
  IconChevronDown,
  IconDownload,
  IconFolder,
  IconTag,
  IconTrash,
} from '@/components/ui/Icons'

interface SidebarProps {
  onVisualExport: () => void
}

export function Sidebar({ onVisualExport }: SidebarProps) {
  const { activeSection, setActiveSection, activeFolderId, setActiveFolderId, activeTagId, setActiveTagId } = useUIStore()
  const { colors } = useColorStore()
  const { historyColors, loadHistory, clearHistory } = useHistoryStore()

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const [foldersOpen, setFoldersOpen] = useState(true)
  const [tagsOpen, setTagsOpen] = useState(true)

  const allCount = colors.filter((c) => !c.is_archived && !c.is_trashed).length
  const favoriteCount = colors.filter((c) => c.is_favorite && !c.is_archived && !c.is_trashed).length

  const navItems: { id: NavSection; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'all', label: 'すべての色', icon: <IconGrid />, count: allCount },
    { id: 'favorites', label: 'お気に入り', icon: <IconStar />, count: favoriteCount },
    { id: 'history', label: '最近使った色', icon: <IconClock /> },
    { id: 'generator', label: 'カラージェネレーター', icon: <IconSparkle /> },
    { id: 'ui-test', label: 'UIテスト', icon: <IconMonitor /> },
  ]

  const handleSelectTag = (id: string) => {
    // 同じタグをクリックでトグル解除
    setActiveTagId(activeTagId === id ? null : id)
  }

  return (
    <aside className="w-[152px] flex-shrink-0 flex flex-col gap-5 px-3 py-4 bg-surface-sidebar border-r border-border-sidebar overflow-y-auto h-full">
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
        <button
          type="button"
          onClick={() => setFoldersOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 mb-2 group"
        >
          <div className="flex items-center gap-1.5 text-text-muted">
            <IconFolder size={12} />
            <p className="text-xs font-medium uppercase tracking-wider">フォルダ</p>
          </div>
          <span className={['text-text-muted transition-transform', foldersOpen ? '' : '-rotate-90'].join(' ')}>
            <IconChevronDown size={12} />
          </span>
        </button>
        {foldersOpen && <FolderList activeFolderId={activeFolderId} onSelectFolder={setActiveFolderId} />}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setTagsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 mb-2 group"
        >
          <div className="flex items-center gap-1.5 text-text-muted">
            <IconTag size={12} />
            <p className="text-xs font-medium uppercase tracking-wider">タグ</p>
          </div>
          <span className={['text-text-muted transition-transform', tagsOpen ? '' : '-rotate-90'].join(' ')}>
            <IconChevronDown size={12} />
          </span>
        </button>
        {tagsOpen && <TagList activeTagId={activeTagId} onSelectTag={handleSelectTag} />}
      </div>

      {/* 履歴 */}
      <div>
        <div className="flex items-center justify-between px-3 mb-2">
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

      {/* ゴミ箱 */}
      <div className="mt-auto">
        <NavItem
          label="ゴミ箱"
          icon={<IconTrash />}
          isActive={activeSection === 'trash' && !activeFolderId}
          onClick={() => setActiveSection('trash')}
        />
      </div>

      {/* ビジュアル書き出し */}
      <div className="pt-2 border-t border-border">
        <button
          type="button"
          onClick={onVisualExport}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-text-muted hover:bg-surface-overlay hover:text-text-primary transition-colors"
        >
          <IconDownload size={14} />
          ビジュアル書き出し
        </button>
      </div>
    </aside>
  )
}
