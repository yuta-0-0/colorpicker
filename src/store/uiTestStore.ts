import { create } from 'zustand'

interface UITestSlot {
  hex: string
  label: string
}

interface UITestStore {
  isActive: boolean
  slots: [UITestSlot, UITestSlot, UITestSlot, UITestSlot] // メイン・サポート・アクセント・オプション
  setSlotHex: (index: 0 | 1 | 2 | 3, hex: string) => void
  applyToUI: () => void
  resetUI: () => void
  toggleActive: () => void
}

const DEFAULT_SLOTS: [UITestSlot, UITestSlot, UITestSlot, UITestSlot] = [
  { hex: '#3B82F6', label: 'メイン' },
  { hex: '#10B981', label: 'サポート' },
  { hex: '#F59E0B', label: 'アクセント' },
  { hex: '#8B5CF6', label: 'オプション' },
]

function hexToRgbSpace(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r} ${g} ${b}`
}

function isValidHexLocal(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

function darken(hex: string): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 20)
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 20)
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 20)
  return `${r} ${g} ${b}`
}

// スロットの CSS 変数名マッピング
const SLOT_CSS_VARS = [
  '--uitest-main',
  '--uitest-support',
  '--uitest-accent',
  '--uitest-option',
] as const

function applySlotToCSSVar(index: number, hex: string) {
  if (!isValidHexLocal(hex)) return
  document.documentElement.style.setProperty(SLOT_CSS_VARS[index], hex)
}

export const useUITestStore = create<UITestStore>((set, get) => ({
  isActive: false,
  slots: DEFAULT_SLOTS,

  setSlotHex: (index, hex) => {
    // 即時 CSS 変数に反映（プレビュー用）
    applySlotToCSSVar(index, hex)
    set((state) => {
      const next = [...state.slots] as typeof state.slots
      next[index] = { ...next[index], hex }
      return { slots: next }
    })
  },

  applyToUI: () => {
    const { slots } = get()
    const mainHex = slots[0].hex
    if (!isValidHexLocal(mainHex)) return
    // メイン色をアクセントとして全体 UI に適用
    document.documentElement.style.setProperty('--color-accent', hexToRgbSpace(mainHex))
    document.documentElement.style.setProperty('--color-accent-hover', darken(mainHex))
    // 全スロットのプレビュー変数を再適用
    slots.forEach((slot, i) => applySlotToCSSVar(i, slot.hex))
    set({ isActive: true })
  },

  resetUI: () => {
    document.documentElement.style.setProperty('--color-accent', '10 62 216')
    document.documentElement.style.setProperty('--color-accent-hover', '8 50 184')
    SLOT_CSS_VARS.forEach((v) => document.documentElement.style.removeProperty(v))
    set({ isActive: false })
  },

  toggleActive: () => {
    const { isActive, applyToUI, resetUI } = get()
    if (isActive) resetUI()
    else applyToUI()
  },
}))
