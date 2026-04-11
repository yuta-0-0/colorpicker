import { useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useFolderStore } from '@/store/folderStore'

export function BulkActionBar() {
  const { bulkSelectedIds, clearBulkSelect } = useUIStore()
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

  return (
    <div className="relative flex items-center gap-2 px-4 py-2 bg-surface-overlay border-b border-border flex-shrink-0">
      <span className="text-xs text-text-secondary mr-2">
        {count}件選択中
      </span>

      <button
        type="button"
        onClick={handleBulkDelete}
        className="px-3 py-1 text-xs rounded-md bg-red-900/40 text-red-300 hover:bg-red-900/60 transition-colors"
      >
        ゴミ箱へ
      </button>

      <button
        type="button"
        onClick={handleBulkArchive}
        className="px-3 py-1 text-xs rounded-md bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors border border-border"
      >
        一括アーカイブ
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowFolderMenu((v) => !v)}
          className="px-3 py-1 text-xs rounded-md bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors border border-border"
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
    </div>
  )
}
