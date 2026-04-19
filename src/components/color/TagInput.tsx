import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTagStore } from '@/store/tagStore'

interface TagInputProps {
  colorId: string
  isLocked: boolean
}

export function TagInput({ colorId, isLocked }: TagInputProps) {
  const { tags, colorTags, fetchColorTags, createTag, addTagToColor, removeTagFromColor } = useTagStore()
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const attachedTags = colorTags[colorId] ?? []

  // DetailPanel が開いたとき（colorId が変わったとき）にタグを取得
  useEffect(() => {
    fetchColorTags(colorId)
  }, [colorId, fetchColorTags])

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setInputValue('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // スクロール・リサイズ時にドロップダウン位置を再計算
  useEffect(() => {
    if (!isOpen) return
    const update = () => {
      if (inputRef.current) {
        setDropdownRect(inputRef.current.getBoundingClientRect())
      }
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [isOpen])

  const openWithPosition = () => {
    if (inputRef.current) {
      setDropdownRect(inputRef.current.getBoundingClientRect())
    }
    setIsOpen(true)
  }

  // 既に付与済みのタグを除外、inputValue で前方一致フィルター
  const filteredTags = tags.filter(
    (t) =>
      !attachedTags.some((a) => a.id === t.id) &&
      t.name.toLowerCase().includes(inputValue.toLowerCase())
  )

  // 新規作成オプションを表示するか（入力があり、完全一致するタグがない場合）
  const showCreateOption =
    inputValue.trim().length > 0 &&
    !tags.some((t) => t.name.toLowerCase() === inputValue.trim().toLowerCase())

  const handleSelectTag = async (tagId: string) => {
    await addTagToColor(colorId, tagId)
    setInputValue('')
    setIsOpen(false)
  }

  const handleCreateAndAdd = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const newTag = await createTag(trimmed)
    if (newTag) {
      await addTagToColor(colorId, newTag.id)
    }
    setInputValue('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return   // IME 変換中は無視
    if (e.key === 'Escape') {
      setIsOpen(false)
      setInputValue('')
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredTags.length > 0) {
        handleSelectTag(filteredTags[0].id)
      } else if (showCreateOption) {
        handleCreateAndAdd()
      }
    }
  }

  return (
    <div>
      {/* 付与済みタグのピル表示（タグがあるときだけ余白を確保） */}
      {attachedTags.length > 0 && (
      <div className="flex flex-wrap gap-1 mb-1.5">
        {attachedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface-overlay text-text-secondary"
          >
            {tag.name}
            {!isLocked && (
              <button
                type="button"
                onClick={() => removeTagFromColor(colorId, tag.id)}
                className="text-text-muted hover:text-text-primary transition-colors leading-none"
                title="タグを外す"
              >
                ✕
              </button>
            )}
          </span>
        ))}
      </div>
      )}

      {/* タグ入力（ロック中は非表示） */}
      {!isLocked && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); openWithPosition() }}
            onFocus={openWithPosition}
            onKeyDown={handleKeyDown}
            placeholder="タグを追加..."
            className="w-full px-0 py-0.5 bg-transparent border-0 text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-colors"
          />

          {/* ドロップダウン — overflow:hidden を回避するため portal で body 直下に描画 */}
          {isOpen && dropdownRect && (filteredTags.length > 0 || showCreateOption) &&
            createPortal(
              <div
                ref={dropdownRef}
                className="glass-popup rounded-lg z-[9999] overflow-hidden"
                style={{
                  position: 'fixed',
                  top: dropdownRect.bottom + 4,
                  left: dropdownRect.left,
                  width: dropdownRect.width,
                }}
              >
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleSelectTag(tag.id)}
                    className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
                  >
                    {tag.name}
                  </button>
                ))}
                {showCreateOption && (
                  <button
                    type="button"
                    onClick={handleCreateAndAdd}
                    className="w-full text-left px-3 py-1.5 text-xs text-accent hover:bg-surface-overlay transition-colors"
                  >
                    「{inputValue.trim()}」を作成して追加
                  </button>
                )}
              </div>,
              document.body
            )
          }
        </div>
      )}
    </div>
  )
}
