/**
 * SidebarLayout — サイドバー付きレイアウトプリミティブ
 *
 * 固定幅のサイド列 + 伸縮するメイン列の2カラムレイアウト。
 * アプリシェル、詳細パネル付きビューなどに使う。
 * Lism CSS の `Sidebar` に相当。
 * ※ コンポーネント名は既存の <Sidebar> と衝突しないよう SidebarLayout とする。
 */
import type { HTMLAttributes, ReactNode } from 'react'

const GAP_MAP = {
  '0': 'gap-0',
  '2': 'gap-2',
  '4': 'gap-4',
  '6': 'gap-6',
  '8': 'gap-8',
} as const

type GapKey = keyof typeof GAP_MAP

interface SidebarLayoutProps extends HTMLAttributes<HTMLDivElement> {
  side: ReactNode
  main: ReactNode
  gap?: GapKey
  /** サイドバーを右に配置するか（デフォルト: 左） */
  sideOnRight?: boolean
}

export function SidebarLayout({
  side,
  main,
  gap = '0',
  sideOnRight = false,
  className = '',
  ...rest
}: SidebarLayoutProps) {
  return (
    <div
      className={['flex h-full overflow-hidden', GAP_MAP[gap], className].join(' ')}
      {...rest}
    >
      {!sideOnRight && <div className="flex-shrink-0">{side}</div>}
      <div className="flex-1 min-w-0 overflow-hidden">{main}</div>
      {sideOnRight && <div className="flex-shrink-0">{sideOnRight ? side : null}</div>}
    </div>
  )
}
