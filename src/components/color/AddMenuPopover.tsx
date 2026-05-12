import { useEffect, useRef } from 'react'

interface AddMenuPopoverProps {
  onSelectText: () => void
  onSelectImage: () => void
  onSelectScreen: () => void
  onClose: () => void
}

export function AddMenuPopover({
  onSelectText,
  onSelectImage,
  onSelectScreen,
  onClose,
}: AddMenuPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

  // 外部クリックで閉じる
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  const items = [
    {
      label: 'テキストで入力',
      description: 'HEX / RGB / HSL',
      onClick: onSelectText,
      show: true,
    },
    {
      label: '画像から取得',
      description: 'スポイト / パレット抽出',
      onClick: onSelectImage,
      show: true,
    },
    {
      label: 'スクリーンから取得',
      description: '画面上の色をクリックで取得',
      onClick: onSelectScreen,
      show: supportsEyeDropper,
    },
  ]

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-52 glass-popup rounded-xl z-50 overflow-hidden"
    >
      {items
        .filter((item) => item.show)
        .map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              onClose()
              item.onClick()
            }}
            className="w-full text-left px-4 py-3 hover:bg-surface-overlay transition-colors"
          >
            <p className="text-sm text-text-primary leading-tight">{item.label}</p>
            <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
          </button>
        ))}
    </div>
  )
}
