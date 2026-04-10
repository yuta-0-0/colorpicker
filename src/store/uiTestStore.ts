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

function darken(hex: string): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 20)
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 20)
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 20)
  return `${r} ${g} ${b}`
}

export const useUITestStore = create<UITestStore>((set, get) => ({
  isActive: false,
  slots: DEFAULT_SLOTS,

  setSlotHex: (index, hex) =>
    set((state) => {
      const next = [...state.slots] as typeof state.slots
      next[index] = { ...next[index], hex }
      return { slots: next }
    }),

  applyToUI: () => {
    const { slots } = get()
    const mainHex = slots[0].hex
    document.documentElement.style.setProperty('--color-accent', hexToRgbSpace(mainHex))
    document.documentElement.style.setProperty('--color-accent-hover', darken(mainHex))
    set({ isActive: true })
  },

  resetUI: () => {
    document.documentElement.style.setProperty('--color-accent', '10 62 216')
    document.documentElement.style.setProperty('--color-accent-hover', '8 50 184')
    set({ isActive: false })
  },

  toggleActive: () => {
    const { isActive, applyToUI, resetUI } = get()
    if (isActive) resetUI()
    else applyToUI()
  },
}))
