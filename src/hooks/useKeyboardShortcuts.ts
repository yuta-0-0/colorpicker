import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'

interface ShortcutHandlers {
  openAddModal: () => void
  openScreenPicker: () => void
}

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

export function useKeyboardShortcuts({ openAddModal, openScreenPicker }: ShortcutHandlers) {
  const {
    selectedColorId,
    setViewMode,
    setActiveSection,
    triggerSearchFocus,
    setIsAddingFolder,
  } = useUIStore()

  const { colors, addColor, deleteColor, undo, redo } = useColorStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Mac: metaKey = ⌘
      if (!e.metaKey) return
      // 入力中は全スキップ
      if (isInputFocused()) return

      const key = e.key.toLowerCase()
      const shift = e.shiftKey

      // ⌘+Z: Undo / ⌘+Shift+Z: Redo
      if (key === 'z') {
        if (shift) {
          e.preventDefault()
          redo()
        } else {
          e.preventDefault()
          undo()
        }
        return
      }

      // ⌘+N: 新規カラー追加モーダルを開く
      if (key === 'n' && !shift) {
        e.preventDefault()
        openAddModal()
        return
      }

      // ⌘+Shift+N: フォルダ追加
      if (key === 'n' && shift) {
        e.preventDefault()
        setIsAddingFolder(true)
        return
      }

      // ⌘+F: 検索フォーカス
      if (key === 'f' && !shift) {
        e.preventDefault()
        triggerSearchFocus()
        return
      }

      // ⌘+1: リストビュー
      if (key === '1') {
        e.preventDefault()
        setViewMode('list')
        return
      }

      // ⌘+2: ギャラリービュー
      if (key === '2') {
        e.preventDefault()
        setViewMode('gallery')
        return
      }

      // ⌘+G: カラージェネレーター
      if (key === 'g' && !shift) {
        e.preventDefault()
        setActiveSection('generator')
        return
      }

      // ⌘+Shift+C: スクリーンピッカー
      if (key === 'c' && shift) {
        e.preventDefault()
        openScreenPicker()
        return
      }

      // 以下は選択中の色が必要
      if (!selectedColorId) return
      const selected = colors.find((c) => c.id === selectedColorId)
      if (!selected) return

      // ⌘+C: 選択色をHEXコピー
      if (key === 'c' && !shift) {
        e.preventDefault()
        navigator.clipboard.writeText(selected.hex)
        return
      }

      // ⌘+D: 選択色を複製
      if (key === 'd' && !shift) {
        e.preventDefault()
        addColor(selected.hex, selected.alpha)
        return
      }

      // ⌘+Delete: 選択色を削除（ロック中は無効）
      // Mac の Delete キーは e.key = 'Backspace'、fn+Delete は 'Delete'
      if (key === 'backspace' || key === 'delete') {
        if (selected.is_locked) return
        e.preventDefault()
        deleteColor(selected.id)
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedColorId,
    colors,
    setViewMode,
    setActiveSection,
    triggerSearchFocus,
    setIsAddingFolder,
    addColor,
    deleteColor,
    undo,
    redo,
    openAddModal,
    openScreenPicker,
  ])
}
