import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ColorListItem } from '@/components/color/ColorListItem'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import type { Color } from '@/types/database'

function SortableColorItem({
  color,
  isSelected,
  isChecked,
  isBulkMode,
  onSelect,
  onCheck,
  onCopy,
  onToggleFavorite,
  onDelete,
}: {
  color: Color
  isSelected: boolean
  isChecked: boolean
  isBulkMode: boolean
  onSelect: () => void
  onCheck: () => void
  onCopy: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: color.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group/drag flex items-center"
    >
      {/* チェックボックス：バルクモード中は常時表示、それ以外はホバー時のみ */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCheck() }}
        className={[
          'flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-opacity mr-0.5',
          isBulkMode
            ? 'opacity-100'
            : 'opacity-0 group-hover/drag:opacity-100',
          isChecked
            ? 'bg-accent text-white'
            : 'border border-border text-transparent hover:border-text-muted',
        ].join(' ')}
        title="選択"
      >
        {isChecked && (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span
        {...attributes}
        {...listeners}
        className="flex-shrink-0 w-5 flex items-center justify-center text-text-muted opacity-0 group-hover/drag:opacity-100 cursor-grab active:cursor-grabbing transition-opacity text-xs select-none"
        title="ドラッグで並び替え"
      >
        ⠿
      </span>
      <div className="flex-1 min-w-0">
        <ColorListItem
          color={color}
          isSelected={isSelected}
          onSelect={onSelect}
          onCopy={onCopy}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}

interface ListViewProps {
  colors: Color[]
}

export function ListView({ colors }: ListViewProps) {
  const { selectedColorId, setSelectedColorId, showArchived, bulkSelectedIds, toggleBulkSelect, isBulkMode } = useUIStore()
  const { updateColor, deleteColor, incrementUsedCount, reorderColors } = useColorStore()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const visibleColors = showArchived ? colors : colors.filter((c) => !c.is_archived)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = visibleColors.findIndex((c) => c.id === active.id)
    const newIndex = visibleColors.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(visibleColors, oldIndex, newIndex)
    reorderColors(reordered.map((c) => c.id))
  }

  const handleCopy = (color: Color, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(color.hex)
    incrementUsedCount(color.id)
  }

  const handleToggleFavorite = (color: Color, e: React.MouseEvent) => {
    e.stopPropagation()
    updateColor(color.id, { is_favorite: !color.is_favorite })
  }

  const handleDelete = (color: Color, e: React.MouseEvent) => {
    e.stopPropagation()
    if (color.is_locked) return
    deleteColor(color.id)
    if (selectedColorId === color.id) setSelectedColorId(null)
  }

  if (visibleColors.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted text-sm">色がありません</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleColors.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {visibleColors.map((color) => (
            <SortableColorItem
              key={color.id}
              color={color}
              isSelected={selectedColorId === color.id}
              isChecked={bulkSelectedIds.includes(color.id)}
              isBulkMode={isBulkMode}
              onSelect={() => setSelectedColorId(color.id)}
              onCheck={() => toggleBulkSelect(color.id)}
              onCopy={(e) => handleCopy(color, e)}
              onToggleFavorite={(e) => handleToggleFavorite(color, e)}
              onDelete={(e) => handleDelete(color, e)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
