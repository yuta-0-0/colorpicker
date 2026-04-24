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
  /** 現在色をスロット先頭に挿入し、末尾を押し出す（プッシュ追加） */
  pushMiniSlot: (hex: string) => void
  setActiveFolderIndex: (index: number) => void
  /** スクリーンピッカーで取得した色を直接セット */
  setCurrentColorFromPicker: (hex: string) => void
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
    set((state) => {
      const colorChanged =
        state.currentColor.hex !== payload.currentColor.hex ||
        state.currentColor.alpha !== payload.currentColor.alpha
      return {
        previousColor: colorChanged ? state.currentColor : state.previousColor,
        currentColor: payload.currentColor,
        history: payload.history,
        folders: payload.folders,
      }
    }),

  swapColors: () =>
    set((state) =>
      state.previousColor
        ? { currentColor: state.previousColor, previousColor: state.currentColor }
        : {}
    ),

  setMiniSlot: (index, hex) =>
    set((state) => {
      if (index < 0 || index >= state.miniSlots.length) return state
      const slots = [...state.miniSlots]
      slots[index] = hex
      return { miniSlots: slots }
    }),

  pushMiniSlot: (hex) =>
    set((state) => ({
      // 先頭に挿入し、末尾（index 3）を押し出す
      miniSlots: [hex, ...state.miniSlots.slice(0, 3)],
    })),

  setActiveFolderIndex: (activeFolderIndex) => set({ activeFolderIndex }),

  setCurrentColorFromPicker: (hex) =>
    set((state) => ({
      previousColor: state.currentColor,
      currentColor: { hex, alpha: 1, name: hex },
    })),
}))
