// src/components/floating/FloatingContextMenu.tsx
// ガラスコンテキストメニュー（絵文字禁止・Phosphor アイコン使用）

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getGlassTokens } from './useTheme'

export interface ContextMenuItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}

interface FloatingContextMenuProps {
  open: boolean
  x: number
  y: number
  items: ContextMenuItem[]
  isDark: boolean
  onClose: () => void
}

export function FloatingContextMenu({ open, x, y, items, isDark, onClose }: FloatingContextMenuProps) {
  const glass = getGlassTokens(isDark)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // click（mousedown ではなく）で外側検知: contextmenu 発火前に close しないためトグルチラつきを防止
    document.addEventListener('click', handleMouse)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('click', handleMouse)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: x,
            top: y,
            zIndex: 1000,
            background: isDark
              ? 'linear-gradient(180deg, rgba(30,40,60,0.96) 0%, rgba(14,20,36,0.96) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(234,240,255,0.96) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: `0.5px solid ${glass.buttonBorder}`,
            borderRadius: 10,
            padding: '4px 0',
            minWidth: 160,
            boxShadow: isDark
              ? 'inset 0 1px 0 rgba(255,255,255,0.10)'
              : 'inset 0 1px 0 rgba(255,255,255,0.90)',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); onClose() }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '6px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: item.danger
                  ? 'rgba(230,60,60,0.85)'
                  : glass.textPrimary,
                fontSize: 11,
                fontWeight: 500,
                textAlign: 'left',
                transition: 'background 80ms ease',
                WebkitAppRegion: 'no-drag',
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  isDark ? 'rgba(255,255,255,0.07)' : 'rgba(10,20,40,0.06)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span style={{ width: 14, display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 0.7 }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
