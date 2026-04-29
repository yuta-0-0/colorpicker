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
  /** スポイト後に自動保存するかどうかのフラグ（長押し判定で true に） */
  pendingSaveAfterPick: boolean
  /** HeroDot ダブルクリック後、FloatingTab マウント時に Explosion を発火するフラグ */
  explosionPending: boolean
  /** FloatingTab ドット上にマウスが乗っている（HeroDot scale 1.1 用） */
  isDotHovered: boolean
  // アクション
  setFloatingState: (state: FloatingState) => void
  setSnapSide: (side: SnapSide) => void
  syncFromIPC: (payload: FSSyncPayload) => void
  swapColors: () => void
  setMiniSlot: (index: number, hex: string | null) => void
  /** 現在色をスロット先頭に挿入し、末尾を押し出す（プッシュ追加・重複スキップ） */
  pushMiniSlot: (hex: string) => void
  /** スロット内の色を Active に昇格し、そのスロットを空にする */
  promoteSlot: (hex: string) => void
  setActiveFolderIndex: (index: number) => void
  /** スクリーンピッカーで取得した色を直接セット */
  setCurrentColorFromPicker: (hex: string) => void
  /** スポイト長押し後の自動保存フラグをセット */
  setPendingSaveAfterPick: (v: boolean) => void
  setExplosionPending: (v: boolean) => void
  setDotHovered: (v: boolean) => void
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
  pendingSaveAfterPick: false,
  explosionPending: false,
  isDotHovered: false,

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
    set((state) => {
      // 既にスロット内に同じ色があれば何もしない（重複排除）
      if (state.miniSlots.some(s => s === hex)) return state
      return { miniSlots: [hex, ...state.miniSlots.slice(0, 3)] }
    }),

  promoteSlot: (hex) =>
    set((state) => ({
      previousColor: state.currentColor,
      currentColor: { hex, alpha: 1, name: hex },
      // そのスロットを空に（Active に昇格したので除去）
      miniSlots: state.miniSlots.map(s => (s === hex ? null : s)),
    })),

  setActiveFolderIndex: (activeFolderIndex) => set({ activeFolderIndex }),

  setCurrentColorFromPicker: (hex) =>
    set((state) => ({
      previousColor: state.currentColor,
      currentColor: { hex, alpha: 1, name: hex },
    })),

  setPendingSaveAfterPick: (pendingSaveAfterPick) => set({ pendingSaveAfterPick }),
  setExplosionPending: (explosionPending) => set({ explosionPending }),
  setDotHovered: (isDotHovered) => set({ isDotHovered }),
}))
