import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Monitor } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useFolderStore } from '@/store/folderStore'

export function BulkActionBar() {
  const { bulkSelectedIds, clearBulkSelect, setActiveSection } = useUIStore()
  const { colors, trashColor, updateColor } = useColorStore()
  const { folders } = useFolderStore()
  const [showFolderMenu, setShowFolderMenu] = useState(false)

  const count = bulkSelectedIds.length

  const handleBulkDelete = async () => {
    for (const id of bulkSelectedIds) {
      const color = colors.find((c) => c.id === id)
      if (color && !color.is_locked) {
        await trashColor(id)
      }
    }
    clearBulkSelect()
  }

  const handleBulkArchive = async () => {
    for (const id of bulkSelectedIds) {
      await updateColor(id, { is_archived: true })
    }
    clearBulkSelect()
  }

  const handleBulkMoveToFolder = async (folderId: string | null) => {
    for (const id of bulkSelectedIds) {
      await updateColor(id, { folder_id: folderId })
    }
    clearBulkSelect()
    setShowFolderMenu(false)
  }

  const handleGoToGenerator = () => {
    setActiveSection('generator')
    // bulkSelectedIds はストアに残しておくことで GeneratorView 側で参照可能
  }

  const handleGoToUITest = () => {
    setActiveSection('ui-test')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="relative flex items-center gap-2 px-4 py-2 bg-accent/8 border-b border-accent/20 flex-shrink-0"
    >
      {/* 選択数 */}
      <span className="text-xs font-medium text-accent-soft mr-1 tabular-nums">
        {count}件選択中
      </span>

      <div className="w-px h-3.5 bg-border mx-0.5 flex-shrink-0" />

      {/* ── ツールショートカット（Figma ツールバー風） ── */}
      <button
        type="button"
        onClick={handleGoToGenerator}
        title={`${count}色をジェネレーターへ`}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-accent/10 text-accent-soft border border-accent/20 hover:bg-accent/20 transition-colors"
      >
        <Sparkles size={11} />
        ジェネレーター
      </button>

      <button
        type="button"
        onClick={handleGoToUITest}
        title={`${count}色をUIテストへ`}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-accent/10 text-accent-soft border border-accent/20 hover:bg-accent/20 transition-colors"
      >
        <Monitor size={11} />
        UIテスト
      </button>

      <div className="w-px h-3.5 bg-border mx-0.5 flex-shrink-0" />

      {/* ── 一括操作 ── */}
      <button
        type="button"
        onClick={handleBulkDelete}
        className="px-2.5 py-1 text-xs rounded-md bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors border border-red-900/30"
      >
        ゴミ箱へ
      </button>

      <button
        type="button"
        onClick={handleBulkArchive}
        className="px-2.5 py-1 text-xs rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors border border-border"
      >
        アーカイブ
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowFolderMenu((v) => !v)}
          className="px-2.5 py-1 text-xs rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors border border-border"
        >
          フォルダ移動 ▾
        </button>
        {showFolderMenu && (
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] glass-popup rounded-lg py-1">
            <button
              type="button"
              onClick={() => handleBulkMoveToFolder(null)}
              className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
            >
              フォルダなし
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => handleBulkMoveToFolder(folder.id)}
                className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
              >
                {folder.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={clearBulkSelect}
        className="ml-auto text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        キャンセル
      </button>
    </motion.div>
  )
}
