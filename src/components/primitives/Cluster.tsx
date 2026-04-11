/**
 * Cluster — 並列グループレイアウトプリミティブ
 *
 * 子要素を横方向に並べ、折り返しあり。
 * アイコン＋テキスト、タグ一覧、ボタングループなどに使う。
 * Lism CSS の `Cluster` に相当。
 */
import type { HTMLAttributes, ReactNode } from 'react'

const GAP_MAP = {
  '1': 'gap-1',
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '6': 'gap-6',
  '8': 'gap-8',
} as const

type GapKey = keyof typeof GAP_MAP

type AlignItems = 'start' | 'center' | 'end' | 'baseline'

const ALIGN_MAP: Record<AlignItems, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
}

interface ClusterProps extends HTMLAttributes<HTMLDivElement> {
  gap?: GapKey
  align?: AlignItems
  wrap?: boolean
  children: ReactNode
}

export function Cluster({
  gap = '2',
  align = 'center',
  wrap = true,
  children,
  className = '',
  ...rest
}: ClusterProps) {
  return (
    <div
      className={[
        'flex',
        wrap ? 'flex-wrap' : 'flex-nowrap',
        ALIGN_MAP[align],
        GAP_MAP[gap],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
