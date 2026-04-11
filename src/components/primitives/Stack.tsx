/**
 * Stack — 縦積みレイアウトプリミティブ
 *
 * 子要素を縦方向に一定間隔で並べる。
 * Lism CSS の `Stack` に相当。
 */
import type { HTMLAttributes, ReactNode } from 'react'

const GAP_MAP = {
  '1': 'gap-1',
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '6': 'gap-6',
  '8': 'gap-8',
  '12': 'gap-12',
} as const

type GapKey = keyof typeof GAP_MAP

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: GapKey
  children: ReactNode
}

export function Stack({ gap = '4', children, className = '', ...rest }: StackProps) {
  return (
    <div className={['flex flex-col', GAP_MAP[gap], className].join(' ')} {...rest}>
      {children}
    </div>
  )
}
