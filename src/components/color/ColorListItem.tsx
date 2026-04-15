import React, { useState, useEffect } from 'react'
import { ColorSwatch } from './ColorSwatch'
import { IconButton } from '@/components/ui/IconButton'
import type { Color } from '@/types/database'
import { IconCopy, IconStar, IconStarFilled, IconX, IconLock } from '@/components/ui/Icons'
import { getEnglishColorName, getKatakanaColorName, getTraditionalColorNameSync } from '@/lib/colorUtils'

interface ColorListItemProps {
  color: Color
  isSelected: boolean
  onSelect: (e: React.MouseEvent) => void
  onCopy: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}

export function ColorListItem({ color, isSelected, onSelect, onCopy, onToggleFavorite, onDelete }: ColorListItemProps) {
  const [enName, setEnName] = useState('')
  const [katakanaName, setKatakanaName] = useState('')
  const traditionalName = getTraditionalColorNameSync(color.hex)

  useEffect(() => {
    setEnName('')
    setKatakanaName('')
    getEnglishColorName(color.hex).then(setEnName)
    getKatakanaColorName(color.hex).then(setKatakanaName)
  }, [color.hex])

  return (
    <div
      onClick={(e) => onSelect(e)}
      className={[
        'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors group',
        isSelected ? 'border border-transparent' : 'border border-transparent hover:bg-surface-raised',
        color.is_archived ? 'opacity-40' : '',
      ].join(' ')}
    >
      <ColorSwatch hex={color.hex} alpha={color.alpha} size="sm" isSelected={isSelected} />
      <div className="flex-1 min-w-0">
        {/* メイン：ユーザー設定名（デフォルトはHEX）*/}
        <p className="text-sm font-mono text-text-primary truncate">
          {color.name || color.hex}
        </p>

        {/* サブ：HEX / EN / カタカナ / 伝統色
            HEXは flex-shrink-0 で常に表示、それ以降は幅不足時に省略 */}
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          <span className="text-xs text-text-muted font-mono flex-shrink-0">{color.hex}</span>
          {enName && (
            <>
              <span className="text-xs text-text-muted/40 flex-shrink-0">/</span>
              <span className="text-xs text-text-muted truncate min-w-0">{enName}</span>
            </>
          )}
          {katakanaName && (
            <>
              <span className="text-xs text-text-muted/40 flex-shrink-0">/</span>
              <span className="text-xs text-text-muted truncate min-w-0">{katakanaName}</span>
            </>
          )}
          {traditionalName && (
            <>
              <span className="text-xs text-text-muted/40 flex-shrink-0">/</span>
              <span className="text-xs text-text-muted truncate min-w-0">{traditionalName}</span>
            </>
          )}
          {color.alpha < 1 && (
            <span className="text-xs text-text-muted/60 flex-shrink-0 ml-0.5">
              A:{Math.round(color.alpha * 100)}%
            </span>
          )}
        </div>
      </div>

      {color.is_locked && (
        <span className="text-text-muted/60 flex-shrink-0" title="ロック中">
          <IconLock size={13} />
        </span>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <IconButton onClick={onCopy} title="コピー"><IconCopy size={13} /></IconButton>
        <IconButton onClick={onToggleFavorite} title={color.is_favorite ? 'お気に入り解除' : 'お気に入り'} active={color.is_favorite}>
          {color.is_favorite ? <IconStarFilled size={13} /> : <IconStar size={13} />}
        </IconButton>
        <IconButton onClick={onDelete} title="削除" danger disabled={color.is_locked}><IconX size={13} /></IconButton>
      </div>

    </div>
  )
}
