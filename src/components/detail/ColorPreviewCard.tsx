import { usePreviewStore, type SlotKey } from '@/store/previewStore'
import { getContrastRatio, getSuggestedTextColor } from '@/lib/contrastUtils'
import { IconWarningCircle } from '@/components/ui/Icons'

const SLOT_LABELS: Record<SlotKey, string> = {
  bg:     'BG',
  text:   'Text',
  button: 'Btn',
  accent: 'Accent',
}

const SLOT_ORDER: SlotKey[] = ['bg', 'text', 'button', 'accent']

export function ColorPreviewCard() {
  const { slots, activeSlot, setActiveSlot, clearSlot } = usePreviewStore()

  const bgHex     = slots.bg.hex     ?? '#1a1a2e'
  const textHex   = slots.text.hex   ?? '#ffffff'
  const buttonHex = slots.button.hex ?? '#000000'
  const accentHex = slots.accent.hex

  const buttonTextColor = getSuggestedTextColor(buttonHex)
  const textContrast    = getContrastRatio(bgHex, textHex)
  const buttonContrast  = getContrastRatio(bgHex, buttonHex)

  const textWarning   = slots.text.hex   !== null && textContrast   < 4.5
  const buttonWarning = slots.button.hex !== null && buttonContrast < 3.0

  const handleBadgeClick = (key: SlotKey) => {
    if (activeSlot === key) {
      if (key !== 'bg') clearSlot(key)
      setActiveSlot(null)
    } else {
      setActiveSlot(key)
    }
  }

  return (
    <div className="space-y-3">
      {/* ── Dummy Web Card ── */}
      <div
        className="rounded-xl p-4 w-full"
        style={{ backgroundColor: bgHex, minHeight: 160 }}
      >
        <h3
          className="text-sm font-semibold mb-1"
          style={{ color: textHex }}
        >
          Sample Heading
        </h3>
        <p
          className="text-xs mb-3"
          style={{ color: textHex, opacity: 0.65 }}
        >
          Body copy. Lorem ipsum dolor sit amet.
        </p>

        {/* Divider (accent or dashed fallback) */}
        <div
          className="mb-3"
          style={
            accentHex
              ? { borderTop: `1px solid ${accentHex}` }
              : { borderTop: '1px dashed rgba(128,128,128,0.35)' }
          }
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs px-2.5 py-1 rounded-md"
            style={{ backgroundColor: buttonHex, color: buttonTextColor }}
          >
            Primary Btn
          </button>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              border: `1px solid ${accentHex ?? 'rgba(128,128,128,0.35)'}`,
              color: textHex,
              opacity: accentHex ? 1 : 0.45,
            }}
          >
            {accentHex ? 'Badge' : '?'}
          </span>
        </div>
      </div>

      {/* ── Slot Badges ── */}
      <div className="flex gap-1.5 flex-wrap">
        {SLOT_ORDER.map((key) => {
          const slot       = slots[key]
          const isActive   = activeSlot === key
          const hasWarning =
            (key === 'text'   && textWarning) ||
            (key === 'button' && buttonWarning)
          const warningTip =
            key === 'text'
              ? `コントラスト比 ${textContrast.toFixed(1)} — WCAG AA 基準（4.5）を下回っています`
              : key === 'button'
              ? `コントラスト比 ${buttonContrast.toFixed(1)} — ボタンが背景に溶けています`
              : ''

          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleBadgeClick(key)}
              title={isActive ? 'リストから色を選んでください' : `${SLOT_LABELS[key]} スロット`}
              className={[
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all',
                isActive
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-border/15 text-text-secondary hover:border-text-muted/60',
              ].join(' ')}
            >
              {slot.hex ? (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: slot.hex }}
                />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-white/30 flex-shrink-0" />
              )}

              <span>{SLOT_LABELS[key]}</span>

              {slot.hex ? (
                <span className="font-mono text-[9px] text-text-muted">
                  {slot.hex.toUpperCase()}
                </span>
              ) : (
                <span className="text-text-muted text-[9px]">未割り当て</span>
              )}

              {slot.isAuto && slot.hex && (
                <span className="text-[8px] text-text-muted opacity-50">auto</span>
              )}

              {hasWarning && (
                <span title={warningTip}>
                  <IconWarningCircle size={10} weight="fill" className="text-yellow-400" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Assignment hint ── */}
      {activeSlot && (
        <p className="text-[11px] text-text-muted">
          リストから色を選んで{' '}
          <span className="text-text-secondary font-medium">{SLOT_LABELS[activeSlot]}</span>
          {' '}に割り当て
        </p>
      )}
    </div>
  )
}
