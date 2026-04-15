import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ShortcutHelpModalProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS: { key: string; label: string }[] = [
  { key: '⌘ N',          label: '新規カラー追加' },
  { key: '⌘ Shift N',    label: '新規フォルダ作成' },
  { key: '⌘ Shift C',    label: 'スクリーンピッカー起動' },
  { key: '⌘ F',          label: '検索' },
  { key: '⌘ C',          label: '選択色をコピー' },
  { key: '⌘ D',          label: '選択色を複製' },
  { key: '⌘ Delete',     label: '選択色を削除' },
  { key: '⌘ Z',          label: 'Undo' },
  { key: '⌘ Shift Z',    label: 'Redo' },
  { key: '⌘ 1',          label: 'リストビュー' },
  { key: '⌘ 2',          label: 'ギャラリービュー' },
  { key: '⌘ G',          label: 'カラージェネレーター' },
  { key: '⌘ Shift P',    label: 'アプリをグローバル呼び出し' },
  { key: '?',            label: 'ショートカット一覧を表示' },
  { key: 'Shift + クリック', label: '範囲選択' },
  { key: '⌘ + クリック',  label: '個別選択（トグル）' },
]

export function ShortcutHelpModal({ open, onClose }: ShortcutHelpModalProps) {
  // ESC で閉じる
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* オーバーレイ */}
          <motion.div
            key="shortcut-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="modal-overlay fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
          >
          {/* モーダル本体 — ラッパー div で完全中央配置、framer-motion 競合回避 */}
          <motion.div
            key="shortcut-modal"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="glass-popup rounded-2xl overflow-hidden"
            style={{ width: 'min(480px, 90vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <p className="text-sm font-semibold text-text-primary tracking-tight">ショートカット</p>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-white/8 transition-colors"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* ショートカット一覧 */}
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
              <div className="space-y-1">
                {SHORTCUTS.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-xs text-text-secondary">{label}</span>
                    <kbd className="text-[11px] font-mono text-text-muted bg-white/6 border border-white/10 rounded-md px-2 py-0.5 leading-none">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
