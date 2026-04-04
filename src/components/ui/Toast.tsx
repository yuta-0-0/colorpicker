import type { Toast } from '@/store/toastStore'
import { useToastStore } from '@/store/toastStore'

interface ToastProps {
  toast: Toast
}

const TYPE_STYLES: Record<Toast['type'], string> = {
  info: 'bg-surface border-border text-text-primary',
  success: 'bg-green-900/80 border-green-700 text-green-100',
  error: 'bg-red-900/80 border-red-700 text-red-100',
}

const TYPE_ICONS: Record<Toast['type'], string> = {
  info: 'ℹ',
  success: '✓',
  error: '✗',
}

export function ToastItem({ toast }: ToastProps) {
  const { removeToast } = useToastStore()

  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm text-sm',
        TYPE_STYLES[toast.type],
      ].join(' ')}
    >
      <span className="flex-shrink-0 text-base">{TYPE_ICONS[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity text-xs"
      >
        ✕
      </button>
    </div>
  )
}
