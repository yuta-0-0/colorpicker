import React, { useEffect, useState } from 'react'
import {
  LayoutGrid,
  Star,
  Clock,
  Sparkles,
  Monitor,
  ChevronDown,
  Download,
  Folder,
  Tag,
  Trash2,
} from 'lucide-react'
import { Cluster } from '@/components/primitives'
import { SearchBar } from './SearchBar'
import { NavItem } from './NavItem'
import { FolderList } from './FolderList'
import { TagList } from './TagList'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useHistoryStore } from '@/store/historyStore'
import type { NavSection } from '@/store/uiStore'

interface SidebarProps {
  onVisualExport: () => void
  width?: number
  onResize?: (width: number) => void
  collapsed?: boolean          // AppLayout が外側で制御するため内部では未使用
  onToggleCollapse?: () => void // 同上
}

export function Sidebar({ onVisualExport, width = 152, onResize }: SidebarProps) {
  const { activeSection, setActiveSection, activeFolderId, setActiveFolderId, activeTagId, setActiveTagId, setSelectedColorId, setIsDetailPanelOpen } = useUIStore()
  const { colors } = useColorStore()
  const { historyColors, loadHistory, clearHistory } = useHistoryStore()

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const [foldersOpen, setFoldersOpen] = useState(true)
  const [tagsOpen, setTagsOpen] = useState(true)

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!onResize) return
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(280, Math.max(120, startWidth + ev.clientX - startX))
      onResize(next)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const allCount = colors.filter((c) => !c.is_archived && !c.is_trashed).length
  const favoriteCount = colors.filter((c) => c.is_favorite && !c.is_archived && !c.is_trashed).length

  const navItems: { id: NavSection; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'all', label: 'すべての色', icon: <LayoutGrid size={14} />, count: allCount },
    { id: 'favorites', label: 'お気に入り', icon: <Star size={14} />, count: favoriteCount },
    { id: 'history', label: '最近使った色', icon: <Clock size={14} /> },
    { id: 'generator', label: 'カラージェネレーター', icon: <Sparkles size={14} /> },
    { id: 'ui-test', label: 'UIテスト', icon: <Monitor size={14} /> },
  ]

  const handleSelectTag = (id: string) => {
    // 同じタグをクリックでトグル解除
    setActiveTagId(activeTagId === id ? null : id)
  }

  return (
    <div
      className="relative flex-1 flex flex-col overflow-y-auto scrollbar-hide"
      style={{ padding: '0.75rem 0.75rem 1rem' }}
    >
      {/* 検索窓 */}
      <SearchBar />

      {/* ナビゲーション */}
      <nav className="mt-4 space-y-0.5">
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

      {/* フォルダ */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setFoldersOpen((v) => !v)}
          className="w-full flex items-center justify-between px-2 mb-1.5 group tactile"
        >
          <div className="flex items-center gap-1.5 text-text-muted">
            <Folder size={11} />
            <p className="text-[10px] font-semibold uppercase tracking-widest">フォルダ</p>
          </div>
          <span className={['text-text-muted transition-transform', foldersOpen ? '' : '-rotate-90'].join(' ')}>
            <ChevronDown size={11} />
          </span>
        </button>
        {foldersOpen && <FolderList activeFolderId={activeFolderId} onSelectFolder={setActiveFolderId} />}
      </div>

      {/* タグ */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setTagsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-2 mb-1.5 group tactile"
        >
          <div className="flex items-center gap-1.5 text-text-muted">
            <Tag size={11} />
            <p className="text-[10px] font-semibold uppercase tracking-widest">タグ</p>
          </div>
          <span className={['text-text-muted transition-transform', tagsOpen ? '' : '-rotate-90'].join(' ')}>
            <ChevronDown size={11} />
          </span>
        </button>
        {tagsOpen && <TagList activeTagId={activeTagId} onSelectTag={handleSelectTag} />}
      </div>

      {/* 最近の色（履歴） */}
      <div className="mt-6">
        <div className="flex items-center justify-between px-2 mb-1.5">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">最近の色</p>
          {historyColors.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="text-[10px] text-text-muted hover:text-text-primary transition-colors tactile"
            >
              クリア
            </button>
          )}
        </div>
        {historyColors.length === 0 ? (
          <p className="px-2 text-xs text-text-muted">履歴はありません</p>
        ) : (
          <Cluster gap="1" className="px-1">
            {historyColors.map((c) => (
              <ColorSwatch
                key={c.id}
                hex={c.hex}
                alpha={c.alpha}
                size="sm"
                onClick={() => {
                  setActiveSection('all')
                  setTimeout(() => {
                    const el = document.querySelector(`[data-color-id="${c.id}"]`)
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      setSelectedColorId(c.id)
                      setIsDetailPanelOpen(true)
                    }
                  }, 80)
                }}
              />
            ))}
          </Cluster>
        )}
      </div>

      {/* ゴミ箱 */}
      <div className="mt-auto pt-4">
        <NavItem
          label="ゴミ箱"
          icon={<Trash2 size={14} />}
          isActive={activeSection === 'trash' && !activeFolderId}
          onClick={() => setActiveSection('trash')}
        />
      </div>

      {/* ビジュアル書き出し */}
      <div className="pt-2 border-t border-white/8 space-y-0.5">
        <button
          type="button"
          onClick={onVisualExport}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-text-muted hover:bg-surface-overlay hover:text-text-primary transition-colors tactile"
        >
          <Download size={13} strokeWidth={1.5} />
          ビジュアル書き出し
        </button>
      </div>

      {/* リサイザーハンドル */}
      {onResize && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize opacity-0 hover:opacity-100 hover:bg-accent/40 transition-opacity"
          title="ドラッグで幅を調整"
        />
      )}
    </div>
  )
}
