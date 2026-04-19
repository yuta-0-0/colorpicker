import { useEffect } from 'react'
import { useColorStore } from '@/store/colorStore'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { IconTrash } from '@/components/ui/Icons'
import { Center, Stack } from '@/components/primitives'

export function TrashView() {
  const { colors, loading, fetchTrashedColors, restoreColor, permanentlyDeleteColor } = useColorStore()

  useEffect(() => {
    fetchTrashedColors()
  }, [fetchTrashedColors])

  if (loading) {
    return (
      <Center full>
        <p className="text-text-muted text-sm">読み込み中...</p>
      </Center>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-border/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-muted">
          <IconTrash size={14} />
          <span className="text-sm font-medium">ゴミ箱</span>
          {colors.length > 0 && (
            <span className="text-xs bg-surface-overlay px-1.5 py-0.5 rounded-full">
              {colors.length}
            </span>
          )}
        </div>
        {colors.length > 0 && (
          <button
            type="button"
            onClick={async () => {
              for (const c of colors) {
                await permanentlyDeleteColor(c.id)
              }
            }}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            すべて完全削除
          </button>
        )}
      </div>

      {/* コンテンツ */}
      {colors.length === 0 ? (
        <Center full>
          <Stack gap="3" className="items-center text-text-muted">
            <IconTrash size={32} />
            <p className="text-sm">ゴミ箱は空です</p>
          </Stack>
        </Center>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-border">
            {colors.map((color) => (
              <li
                key={color.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-overlay/40 transition-colors group"
              >
                <ColorSwatch hex={color.hex} alpha={color.alpha} size="sm" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{color.name}</p>
                  <p className="text-xs text-text-muted font-mono">{color.hex}</p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => restoreColor(color.id)}
                    className="px-2 py-1 text-xs text-text-muted hover:text-text-primary bg-surface-overlay hover:bg-surface-raised rounded transition-colors"
                  >
                    元に戻す
                  </button>
                  <button
                    type="button"
                    onClick={() => permanentlyDeleteColor(color.id)}
                    className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-surface-overlay hover:bg-surface-raised rounded transition-colors"
                  >
                    完全削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
