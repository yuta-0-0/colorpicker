import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconPlus, IconX, IconArrowBendDownRight } from '@/components/ui/Icons'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useFolderStore } from '@/store/folderStore'
import { useUIStore } from '@/store/uiStore'
import type { Folder } from '@/types/database'
import { FolderIconPicker, FolderIconComponent } from './FolderIconPicker'

/** parent_id を基にフォルダをツリー順（深さ優先）に並べる */
function buildFolderTree(folders: Folder[]): { folder: Folder; depth: number }[] {
  const result: { folder: Folder; depth: number }[] = []
  const addWithChildren = (parentId: string | null, depth: number) => {
    const items = folders
      .filter((f) => (f.parent_id ?? null) === parentId)
      .sort((a, b) => a.order - b.order)
    for (const f of items) {
      result.push({ folder: f, depth })
      addWithChildren(f.id, depth + 1)
    }
  }
  addWithChildren(null, 0)
  return result
}

function SortableFolderItem({
  folder,
  isActive,
  onSelect,
  onRename,
  onDelete,
  onIconChange,
  onAddChild,
}: {
  folder: Folder
  isActive: boolean
  onSelect: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onIconChange: (icon: string) => void
  onAddChild: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(folder.name)
  const [showIconPicker, setShowIconPicker] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: folder.id,
  })

  const handleRenameSubmit = () => {
    if (editValue.trim() && editValue !== folder.name) {
      onRename(editValue.trim())
    }
    setIsEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors tactile"
    >
      {/* ドラッグハンドル */}
      <span
        {...attributes}
        {...listeners}
        className="text-text-muted cursor-grab opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="ドラッグで並び替え"
      >
        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
          <circle cx="2" cy="2" r="1.5"/><circle cx="6" cy="2" r="1.5"/>
          <circle cx="2" cy="6" r="1.5"/><circle cx="6" cy="6" r="1.5"/>
          <circle cx="2" cy="10" r="1.5"/><circle cx="6" cy="10" r="1.5"/>
        </svg>
      </span>

      {/* アイコン（クリックでピッカー） */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowIconPicker((v) => !v) }}
          className="text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
          title="アイコンを変更"
        >
          <FolderIconComponent iconKey={folder.icon ?? null} size={13} />
        </button>
        {showIconPicker && (
          <FolderIconPicker
            currentIcon={folder.icon}
            onSelect={onIconChange}
            onClose={() => setShowIconPicker(false)}
          />
        )}
      </div>

      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit()
            if (e.key === 'Escape') { setEditValue(folder.name); setIsEditing(false) }
          }}
          autoFocus
          className="flex-1 bg-surface-raised border border-accent/60 rounded-md px-1 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
        />
      ) : (
        <button
          onClick={onSelect}
          onDoubleClick={() => setIsEditing(true)}
          type="button"
          className={[
            'flex-1 text-sm text-left truncate',
            isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          {folder.name}
        </button>
      )}

      {!isEditing && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
          {/* サブフォルダを追加 */}
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild() }}
            type="button"
            className="p-0.5 text-text-muted hover:text-text-secondary transition-colors"
            title="サブフォルダを追加"
          >
            <IconArrowBendDownRight size={10} />
          </button>
          {/* 削除 */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            type="button"
            className="p-0.5 text-text-muted hover:text-red-400 transition-colors"
            title="フォルダを削除"
          >
            <IconX size={10} />
          </button>
        </div>
      )}
    </div>
  )
}

interface FolderListProps {
  activeFolderId: string | null
  onSelectFolder: (id: string) => void
}

export function FolderList({ activeFolderId, onSelectFolder }: FolderListProps) {
  const { folders, createFolder, renameFolder, deleteFolder, reorderFolders, updateFolder } = useFolderStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  // サブフォルダ作成時の親フォルダID
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null)

  const { isAddingFolder, setIsAddingFolder } = useUIStore()

  useEffect(() => {
    if (isAddingFolder) {
      setIsCreating(true)
      setCreatingParentId(null)
      setIsAddingFolder(false)
    }
  }, [isAddingFolder, setIsAddingFolder])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = folders.findIndex((f) => f.id === active.id)
    const newIndex = folders.findIndex((f) => f.id === over.id)
    const reordered = arrayMove(folders, oldIndex, newIndex)
    reorderFolders(reordered.map((f) => f.id))
  }

  const handleCreateSubmit = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim(), creatingParentId)
    }
    setNewFolderName('')
    setIsCreating(false)
    setCreatingParentId(null)
  }

  const handleAddChild = (parentId: string) => {
    setCreatingParentId(parentId)
    setIsCreating(true)
  }

  const treeItems = buildFolderTree(folders)

  return (
    <div className="space-y-0.5">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={folders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {treeItems.map(({ folder, depth }) => (
              <motion.div
                key={folder.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10, height: 0, overflow: 'hidden' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{ paddingLeft: depth * 12 }}
              >
                {/* 深さ > 0 は先頭にガイドラインを表示 */}
                {depth > 0 && (
                  <div
                    className="absolute left-0 top-0 bottom-0 border-l border-white/10"
                    style={{ marginLeft: depth * 12 - 6 }}
                  />
                )}
                <SortableFolderItem
                  folder={folder}
                  isActive={activeFolderId === folder.id}
                  onSelect={() => onSelectFolder(folder.id)}
                  onRename={(name) => renameFolder(folder.id, name)}
                  onDelete={() => deleteFolder(folder.id)}
                  onIconChange={(icon) => updateFolder(folder.id, { icon })}
                  onAddChild={() => handleAddChild(folder.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
      </DndContext>

      {isCreating ? (
        <div className="px-2.5 py-1.5" style={{ paddingLeft: creatingParentId ? 24 : undefined }}>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreateSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateSubmit()
              if (e.key === 'Escape') { setNewFolderName(''); setIsCreating(false); setCreatingParentId(null) }
            }}
            autoFocus
            placeholder={creatingParentId ? 'サブフォルダ名' : 'フォルダ名'}
            className="w-full bg-surface-raised border border-accent/60 rounded-md px-2 py-0.5 text-sm text-text-primary focus:outline-none focus:border-accent placeholder:text-text-muted transition-colors"
          />
        </div>
      ) : (
        <button
          onClick={() => { setCreatingParentId(null); setIsCreating(true) }}
          type="button"
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-secondary transition-colors text-left tactile"
        >
          <IconPlus size={12} />
          <span>フォルダを追加</span>
        </button>
      )}
    </div>
  )
}
