import { create } from 'zustand'
import { getSuggestedTextColor } from '@/lib/contrastUtils'

export type SlotKey = 'bg' | 'text' | 'button' | 'accent'

export interface PreviewSlot {
  hex: string | null
  isAuto: boolean
}

interface PreviewStore {
  slots: Record<SlotKey, PreviewSlot>
  activeSlot: SlotKey | null
  syncBgFromSelected: (hex: string) => void
  setSlot: (key: SlotKey, hex: string) => void
  clearSlot: (key: SlotKey) => void
  setActiveSlot: (key: SlotKey | null) => void
  reset: () => void
}

const EMPTY_SLOTS: Record<SlotKey, PreviewSlot> = {
  bg:     { hex: null, isAuto: false },
  text:   { hex: null, isAuto: true },
  button: { hex: null, isAuto: true },
  accent: { hex: null, isAuto: true },
}

export const usePreviewStore = create<PreviewStore>((set) => ({
  slots: { ...EMPTY_SLOTS },
  activeSlot: null,

  syncBgFromSelected: (hex) => {
    set((state) => {
      const autoColor = getSuggestedTextColor(hex)
      return {
        slots: {
          bg:     { hex, isAuto: false },
          text:   state.slots.text.isAuto   ? { hex: autoColor, isAuto: true } : state.slots.text,
          button: state.slots.button.isAuto ? { hex: autoColor, isAuto: true } : state.slots.button,
          accent: state.slots.accent,
        },
      }
    })
  },

  setSlot: (key, hex) => {
    set((state) => ({
      slots: { ...state.slots, [key]: { hex, isAuto: false } },
      activeSlot: null,
    }))
  },

  clearSlot: (key) => {
    set((state) => {
      const bgHex = state.slots.bg.hex ?? '#000000'
      const autoColor = getSuggestedTextColor(bgHex)
      const restored: PreviewSlot =
        key === 'accent'
          ? { hex: null, isAuto: true }
          : { hex: autoColor, isAuto: true }
      return { slots: { ...state.slots, [key]: restored } }
    })
  },

  setActiveSlot: (key) => set({ activeSlot: key }),

  reset: () => {
    set((state) => {
      const bgHex = state.slots.bg.hex ?? '#000000'
      const autoColor = getSuggestedTextColor(bgHex)
      return {
        slots: {
          bg:     { hex: bgHex, isAuto: false },
          text:   { hex: autoColor, isAuto: true },
          button: { hex: autoColor, isAuto: true },
          accent: { hex: null, isAuto: true },
        },
        activeSlot: null,
      }
    })
  },
}))
