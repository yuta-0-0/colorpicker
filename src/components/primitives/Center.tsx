/**
 * Center — 中央配置レイアウトプリミティブ
 *
 * 子要素を水平・垂直中央に配置する。
 * ローディング表示、空状態、アイコンなどに使う。
 * Lism CSS の `Center` に相当。
 */
import type { HTMLAttributes, ReactNode } from 'react'

interface CenterProps extends HTMLAttributes<HTMLDivElement> {
  /** 垂直方向も中央寄せ（親要素に高さが必要）*/
  full?: boolean
  children: ReactNode
}

export function Center({ full = false, children, className = '', ...rest }: CenterProps) {
  return (
    <div
      className={[
        'flex items-center justify-center',
        full ? 'flex-1 h-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
