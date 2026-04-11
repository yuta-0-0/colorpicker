/**
 * FolderIconPicker — フォルダアイコン選択ポップオーバー
 *
 * よく使う絵文字セットから選択できる小さなピッカー。
 * フォルダ行のアイコンをクリックすると表示される。
 */

const ICON_OPTIONS = [
  '📁', '📂', '🗂️',
  '🎨', '🖌️', '🖼️',
  '🌈', '✨', '⭐️',
  '🔴', '🟠', '🟡', '🟢', '🔵', '🟣',
  '❤️', '🧡', '💛', '💚', '💙', '💜',
  '🌸', '🌺', '🌻', '🌹', '🍀', '🌿',
  '☀️', '🌙', '⚡', '🔥', '💧', '🌊',
  '💎', '🏆', '🎯', '🎪', '🎭', '🎬',
  '📌', '📍', '🗝️', '🔑', '📎', '✂️',
]

interface FolderIconPickerProps {
  currentIcon: string | null
  onSelect: (icon: string) => void
  onClose: () => void
}

export function FolderIconPicker({ currentIcon, onSelect, onClose }: FolderIconPickerProps) {
  return (
    <>
      {/* 背景オーバーレイ（クリックで閉じる） */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* ピッカー本体 */}
      <div
        className="absolute left-0 top-full mt-1 z-50 glass-popup rounded-xl p-2"
        style={{ width: 180 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs text-text-muted px-1 pb-1.5">アイコンを選択</p>
        <div className="grid grid-cols-6 gap-0.5">
          {ICON_OPTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => { onSelect(icon); onClose() }}
              className={[
                'w-7 h-7 flex items-center justify-center rounded-lg text-base transition-colors hover:bg-surface-overlay',
                currentIcon === icon ? 'bg-accent/20 ring-1 ring-accent' : '',
              ].join(' ')}
              title={icon}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
