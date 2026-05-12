// src/store/floatingStore.ts
import { create } from 'zustand'
import type { FSColorData, FSHistoryItem, FSFolderData, FSSyncPayload, SnapSide, FloatingState } from '@/types/floating'

const DEFAULT_COLOR: FSColorData = { hex: '#3A7BD5', alpha: 1, name: 'カラーピッカー' }

// null を末尾に詰める（上から順に色が並ぶ）
const packSlots = (slots: (string | null)[]): (string | null)[] => {
  const filled = slots.filter((s): s is string => s !== null)
  return [...filled, ...Array(slots.length - filled.length).fill(null)]
}

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
  /** FloatingTab ドット上にマウスが乗っている（HeroDot scale 1.1 用） */
  isDotHovered: boolean
  /** syncFromIPC が currentColor を上書きしない期限（ms timestamp）*/
  _syncLockUntil: number
  // アクション
  setFloatingState: (state: FloatingState) => void
  setSnapSide: (side: SnapSide) => void
  syncFromIPC: (payload: FSSyncPayload) => void
  swapColors: () => void
  setMiniSlot: (index: number, hex: string | null) => void
  /** 現在色をスロット先頭に挿入し、末尾を押し出す（プッシュ追加・重複スキップ） */
  pushMiniSlot: (hex: string) => void
  /** スロット i の色と currentColor を交換する */
  swapWithSlot: (index: number) => void
  setActiveFolderIndex: (index: number) => void
  /** 履歴内の hex を先頭に移動（handleApply の楽観的 UI 更新） */
  promoteHistory: (hex: string) => void
  /** スクリーンピッカーで取得した色を直接セット（1500ms 間 syncFromIPC ロック） */
  setCurrentColorFromPicker: (hex: string) => void
  setDotHovered: (v: boolean) => void
  /** B→Main 直結: FloatingToolbar アンマウント後も FloatingSystemView でタイマー継続 */
  isBToMainPending: boolean
  setBToMainPending: (v: boolean) => void
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
  isDotHovered: false,
  _syncLockUntil: 0,
  isBToMainPending: false,

  setFloatingState: (floatingState) => set({ floatingState }),

  setSnapSide: (snapSide) => set({ snapSide }),

  syncFromIPC: (payload) =>
    set((state) => {
      // ローカルで setCurrentColorFromPicker を呼んだ直後は currentColor を上書きしない
      const locked = Date.now() < state._syncLockUntil
      const newColor = locked ? state.currentColor : payload.currentColor
      const colorChanged =
        !locked && (
          state.currentColor.hex !== payload.currentColor.hex ||
          state.currentColor.alpha !== payload.currentColor.alpha
        )
      return {
        previousColor: colorChanged ? state.currentColor : state.previousColor,
        currentColor: newColor,
        history: payload.history,
        folders: payload.folders,
        // A案: 新 currentColor と同色のスロットを消して詰める
        miniSlots: colorChanged
          ? packSlots(state.miniSlots.map(s => s === newColor.hex ? null : s))
          : state.miniSlots,
      }
    }),

  swapColors: () =>
    set((state) =>
      state.previousColor
        ? {
            currentColor: state.previousColor,
            previousColor: state.currentColor,
            // A案: 新 currentColor（= previousColor）と同色のスロットを消して詰める
            miniSlots: packSlots(state.miniSlots.map(s => s === state.previousColor!.hex ? null : s)),
          }
        : {}
    ),

  setMiniSlot: (index, hex) =>
    set((state) => {
      if (index < 0 || index >= state.miniSlots.length) return state
      const slots = [...state.miniSlots]
      slots[index] = hex
      return { miniSlots: hex === null ? packSlots(slots) : slots }
    }),

  pushMiniSlot: (hex) =>
    set((state) => {
      // 既にスロット内に同じ色があれば何もしない（重複排除）
      if (state.miniSlots.some(s => s === hex)) return state
      return { miniSlots: [hex, ...state.miniSlots.slice(0, 3)] }
    }),

  swapWithSlot: (index) =>
    set((state) => {
      if (index < 0 || index >= state.miniSlots.length) return state
      const slotHex = state.miniSlots[index]
      if (!slotHex) return state
      // 同じ色の場合は何もしない
      if (slotHex === state.currentColor.hex) return state
      const slots = [...state.miniSlots]
      // 他スロットに旧 currentColor があればクリア（重複防止: 移動扱い）
      for (let i = 0; i < slots.length; i++) {
        if (i !== index && slots[i] === state.currentColor.hex) slots[i] = null
      }
      slots[index] = state.currentColor.hex
      return {
        // syncFromIPC がスワップ結果を即上書きしないよう 1000ms ロック
        _syncLockUntil: Date.now() + 1000,
        previousColor: state.currentColor,
        currentColor: { hex: slotHex, alpha: 1, name: slotHex },
        miniSlots: packSlots(slots),
      }
    }),

  setActiveFolderIndex: (activeFolderIndex) => set({ activeFolderIndex }),

  promoteHistory: (hex) =>
    set((state) => {
      const existing = state.history.find(h => h.hex === hex)
      if (!existing) return state
      const filtered = state.history.filter(h => h.hex !== hex)
      return { history: [existing, ...filtered] }
    }),

  setCurrentColorFromPicker: (hex) =>
    set((state) => ({
      _syncLockUntil: Date.now() + 1500,
      previousColor: state.currentColor,
      currentColor: { hex, alpha: 1, name: hex },
      // A案: 新 currentColor と同色のスロットを消して詰める
      miniSlots: packSlots(state.miniSlots.map(s => s === hex ? null : s)),
    })),

  setDotHovered: (isDotHovered) => set({ isDotHovered }),
  setBToMainPending: (isBToMainPending) => set({ isBToMainPending }),
}))
