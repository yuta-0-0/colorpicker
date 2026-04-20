// src/store/floatingStore.ts
import { create } from 'zustand'
import type { FSColorData, FSHistoryItem, FSFolderData, FSSyncPayload, SnapSide, FloatingState } from '@/types/floating'

const DEFAULT_COLOR: FSColorData = { hex: '#3A7BD5', alpha: 1, name: 'カラーピッカー' }

interface FloatingStore {
  // 状態
  floatingState: FloatingState
  snapSide: SnapSide
  currentColor: FSColorData
  previousColor: FSColorData | null
  history: FSHistoryItem[]
  folders: FSFolderData[]
  activeFolderIndex: number // 0 = 履歴, 1以降 = folders[index-1]
  miniSlots: (string | null)[]  // 最大4スロット
  // アクション
  setFloatingState: (state: FloatingState) => void
  setSnapSide: (side: SnapSide) => void
  syncFromIPC: (payload: FSSyncPayload) => void
  swapColors: () => void
  setMiniSlot: (index: number, hex: string | null) => void
  setActiveFolderIndex: (index: number) => void
}

export const useFloatingStore = create<FloatingStore>((set) => ({
  floatingState: 'tab',
  snapSide: 'none',
  currentColor: DEFAULT_COLOR,
  previousColor: null,
  history: [],
  folders: [],
  activeFolderIndex: 0,
  miniSlots: [null, null, null, null],

  setFloatingState: (floatingState) => set({ floatingState }),

  setSnapSide: (snapSide) => set({ snapSide }),

  syncFromIPC: (payload) =>
    set((state) => ({
      previousColor: state.currentColor.hex !== payload.currentColor.hex
        ? state.currentColor
        : state.previousColor,
      currentColor: payload.currentColor,
      history: payload.history,
      folders: payload.folders,
    })),

  swapColors: () =>
    set((state) => {
      if (!state.previousColor) return state
      return {
        currentColor: state.previousColor,
        previousColor: state.currentColor,
      }
    }),

  setMiniSlot: (index, hex) =>
    set((state) => {
      const slots = [...state.miniSlots]
      slots[index] = hex
      return { miniSlots: slots }
    }),

  setActiveFolderIndex: (activeFolderIndex) => set({ activeFolderIndex }),
}))
