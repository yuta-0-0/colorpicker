import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  IconSparkle,
  IconTrash,
  IconArchive,
  IconFolderSimplePlus,
  IconX,
} from '@/components/ui/Icons'
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
      if (color && !color.is_locked) await trashColor(id)
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
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 36, mass: 0.6 }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl"
        style={{
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          background: 'rgba(15, 21, 36, 0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        {/* 選択数バッジ */}
        <span className="text-xs font-semibold text-accent-soft tabular-nums px-2 py-1 bg-accent/15 rounded-xl mr-0.5 flex-shrink-0">
          {count}件
        </span>

        <div className="w-px h-4 bg-white/12 flex-shrink-0" />

        {/* ジェネレーター */}
        <FabBtn
          icon={<IconSparkle size={13} />}
          label="ジェネレーター"
          onClick={() => setActiveSection('generator')}
        />

        <div className="w-px h-4 bg-white/12 flex-shrink-0" />

        {/* アーカイブ */}
        <FabBtn
          icon={<IconArchive size={13} />}
          label="アーカイブ"
          onClick={handleBulkArchive}
        />

        {/* フォルダ移動 */}
        <div className="relative">
          <FabBtn
            icon={<IconFolderSimplePlus size={13} />}
            label="フォルダ移動"
            onClick={() => setShowFolderMenu((v) => !v)}
            isActive={showFolderMenu}
          />
          {showFolderMenu && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={() => setShowFolderMenu(false)} />
              <div
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[150px] rounded-xl py-1 z-[100]"
                style={{
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  background: 'rgba(15, 21, 36, 0.94)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleBulkMoveToFolder(null)}
                  className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/8 transition-colors"
                >
                  フォルダなし
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => handleBulkMoveToFolder(folder.id)}
                    className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/8 transition-colors"
                  >
                    {folder.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 削除 */}
        <FabBtn
          icon={<IconTrash size={13} />}
          label="ゴミ箱へ"
          onClick={handleBulkDelete}
          danger
        />

        <div className="w-px h-4 bg-white/12 flex-shrink-0" />

        {/* キャンセル */}
        <button
          type="button"
          onClick={clearBulkSelect}
          title="選択を解除"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/8 transition-colors flex-shrink-0"
        >
          <IconX size={13} />
        </button>
      </div>
    </motion.div>
    </div>
  )
}

// ── FAB内ボタン ──────────────────────────────────────────────────────────────
function FabBtn({
  icon,
  label,
  onClick,
  danger = false,
  isActive = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  isActive?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all tactile flex-shrink-0',
        danger
          ? 'text-red-400 hover:bg-red-500/15'
          : isActive
          ? 'bg-accent/15 text-accent-soft'
          : 'text-text-secondary hover:text-text-primary hover:bg-white/8',
      ].join(' ')}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
