/**
 * workspaceStore.ts
 *
 * WORKSPACE STATE — デザイナーの脳内作業空間
 *
 * 責務：
 *   「今考えていること」のみを保持する。
 *   永続記憶ではない。セッション終了で揮発する。
 *
 * 状態分類（3層）:
 *   A. Judgment State  — currentColor / previousColor（Undo 対象）
 *   B. Context State   — miniSlots / history（比較机。Undo 対象外）
 *   C. Physical State  — floatingState / snapSide（身体配置。Undo 対象外）
 *
 * Judgment Rollback 原則:
 *   Undo は「色選択のやり直し」のみ。
 *   miniSlots / floatingState / UI は巻き戻さない。
 *
 * 制約（全て絶対）:
 *   - Supabase 直接接続 禁止
 *   - currentColor の自動保存 禁止
 *   - Undo で UI 状態を戻す 禁止
 *   - memoryStore との混線 禁止
 */

import { create } from 'zustand'
import type {
  FSColorData,
  FSHistoryItem,
  FSFolderData,
  FSSyncPayload,
  SnapSide,
  FloatingState,
} from '@/types/floating'

const DEFAULT_COLOR: FSColorData = { hex: '#3A7BD5', alpha: 1, name: 'カラーピッカー' }

// Undo/Redo の snapshot 対象は Judgment State のみ
type JudgmentSnapshot = {
  currentColor: FSColorData
  previousColor: FSColorData | null
}

// null を末尾に詰める（比較机: 上から順に色が並ぶ）
const packSlots = (slots: (string | null)[]): (string | null)[] => {
  const filled = slots.filter((s): s is string => s !== null)
  return [...filled, ...Array(slots.length - filled.length).fill(null)]
}

interface WorkspaceState {
  // ── C. Physical State（Undo 対象外）────────────────────────────────
  /** A/B の状態（tab / toolbar） */
  floatingState: FloatingState
  /** Floating Window のスナップ位置 */
  snapSide: SnapSide

  // ── A. Judgment State（Undo 対象）──────────────────────────────────
  /** 現在の判断対象色。保存されていない。自動保存禁止。 */
  currentColor: FSColorData
  /** Swap 前の色。身体記憶。 */
  previousColor: FSColorData | null

  // ── B. Context State（Undo 対象外）────────────────────────────────
  /**
   * 比較机（最大4スロット）。
   * 保存機能ではない / favorite ではない / memory ではない。
   * Undo で消えない / Supabase 保存禁止 / usedCount 対象外。
   */
  miniSlots: (string | null)[]
  /** IPC 同期の取得記録（Floating Bar 内の履歴表示用） */
  history: FSHistoryItem[]
  /** IPC 同期のフォルダ一覧（memoryStore の参照コピー） */
  folders: FSFolderData[]
  /** アクティブなフォルダインデックス（0 = 履歴） */
  activeFolderIndex: number

  // ── 遷移制御 ────────────────────────────────────────────────────────
  /** B→Main 直結タイマーフラグ */
  isBToMainPending: boolean
  /**
   * syncFromIPC が currentColor を上書きしない間は true。
   * 時間管理は FloatingSystemView の ref タイマーが担当（Store 外）。
   * _syncLockUntil（timestamp）を廃止し、boolean に単純化。
   */
  _syncLocked: boolean

  // ── Judgment Rollback（Undo/Redo）───────────────────────────────────
  /** 判断スナップショット（currentColor + previousColor のみ。max 20）*/
  undoStack: JudgmentSnapshot[]
  redoStack: JudgmentSnapshot[]

  // ── Actions ─────────────────────────────────────────────────────────

  // Physical State
  setFloatingState: (s: FloatingState) => void
  setSnapSide: (s: SnapSide) => void

  // IPC 同期
  syncFromIPC: (payload: FSSyncPayload) => void

  // Judgment State
  swapColors: () => void
  setCurrentColorFromPicker: (hex: string) => void
  setSyncLocked: (v: boolean) => void

  // Context State（比較机）
  setMiniSlot: (index: number, hex: string | null) => void
  pushMiniSlot: (hex: string) => void
  swapWithSlot: (index: number) => void

  // History / Folder
  setActiveFolderIndex: (i: number) => void
  promoteHistory: (hex: string) => void

  // 遷移制御
  setBToMainPending: (v: boolean) => void

  // Judgment Rollback
  /** Judgment State のみを snapshot 化。miniSlots は含めない。 */
  _snapshotJudgment: () => void
  undo: () => void
  redo: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  // ── 初期値 ──────────────────────────────────────────────────────────
  floatingState: 'tab',
  snapSide: 'none',
  currentColor: DEFAULT_COLOR,
  previousColor: null,
  miniSlots: [null, null, null, null],
  history: [],
  folders: [],
  activeFolderIndex: 0,
  isBToMainPending: false,
  _syncLocked: false,
  undoStack: [],
  redoStack: [],

  // ── Physical State ───────────────────────────────────────────────────
  setFloatingState: (floatingState) => set({ floatingState }),
  setSnapSide: (snapSide) => set({ snapSide }),

  // ── IPC 同期 ─────────────────────────────────────────────────────────
  syncFromIPC: (payload) =>
    set((state) => {
      // _syncLocked 中は currentColor を上書きしない
      const newColor = state._syncLocked ? state.currentColor : payload.currentColor
      const colorChanged =
        !state._syncLocked && (
          state.currentColor.hex !== payload.currentColor.hex ||
          state.currentColor.alpha !== payload.currentColor.alpha
        )
      return {
        previousColor: colorChanged ? state.currentColor : state.previousColor,
        currentColor: newColor,
        history: payload.history,
        folders: payload.folders,
        // 新 currentColor と同色のスロットを消して詰める
        miniSlots: colorChanged
          ? packSlots(state.miniSlots.map(s => s === newColor.hex ? null : s))
          : state.miniSlots,
      }
    }),

  // ── Judgment State ───────────────────────────────────────────────────
  swapColors: () =>
    set((state) =>
      state.previousColor
        ? {
            currentColor: state.previousColor,
            previousColor: state.currentColor,
            miniSlots: packSlots(
              state.miniSlots.map(s => s === state.previousColor!.hex ? null : s)
            ),
          }
        : {}
    ),

  setCurrentColorFromPicker: (hex) =>
    set((state) => ({
      _syncLocked: true,  // FloatingSystemView の ref タイマーが解除する
      previousColor: state.currentColor,
      currentColor: { hex, alpha: 1, name: hex },
      miniSlots: packSlots(state.miniSlots.map(s => s === hex ? null : s)),
    })),

  setSyncLocked: (v) => set({ _syncLocked: v }),

  // ── Context State（比較机）──────────────────────────────────────────
  setMiniSlot: (index, hex) =>
    set((state) => {
      if (index < 0 || index >= state.miniSlots.length) return state
      const slots = [...state.miniSlots]
      slots[index] = hex
      return { miniSlots: hex === null ? packSlots(slots) : slots }
    }),

  pushMiniSlot: (hex) =>
    set((state) => {
      if (state.miniSlots.some(s => s === hex)) return state
      return { miniSlots: [hex, ...state.miniSlots.slice(0, 3)] }
    }),

  swapWithSlot: (index) =>
    set((state) => {
      if (index < 0 || index >= state.miniSlots.length) return state
      const slotHex = state.miniSlots[index]
      if (!slotHex) return state
      if (slotHex === state.currentColor.hex) return state
      const slots = [...state.miniSlots]
      for (let i = 0; i < slots.length; i++) {
        if (i !== index && slots[i] === state.currentColor.hex) slots[i] = null
      }
      slots[index] = state.currentColor.hex
      return {
        _syncLocked: true,  // FloatingSystemView の ref タイマーが 1000ms 後に解除
        previousColor: state.currentColor,
        currentColor: { hex: slotHex, alpha: 1, name: slotHex },
        miniSlots: packSlots(slots),
      }
    }),

  // ── History / Folder ─────────────────────────────────────────────────
  setActiveFolderIndex: (activeFolderIndex) => set({ activeFolderIndex }),

  promoteHistory: (hex) =>
    set((state) => {
      const existing = state.history.find(h => h.hex === hex)
      if (!existing) return state
      const filtered = state.history.filter(h => h.hex !== hex)
      return { history: [existing, ...filtered] }
    }),

  // ── 遷移制御 ─────────────────────────────────────────────────────────
  setBToMainPending: (isBToMainPending) => set({ isBToMainPending }),

  // ── Judgment Rollback ────────────────────────────────────────────────
  _snapshotJudgment: () => {
    set((state) => ({
      undoStack: [
        ...state.undoStack.slice(-19),
        { currentColor: state.currentColor, previousColor: state.previousColor },
      ],
      redoStack: [],
    }))
  },

  undo: () => {
    set((state) => {
      if (state.undoStack.length === 0) return state
      const prev = state.undoStack[state.undoStack.length - 1]
      return {
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [
          ...state.redoStack,
          { currentColor: state.currentColor, previousColor: state.previousColor },
        ],
        currentColor: prev.currentColor,
        previousColor: prev.previousColor,
        // miniSlots / floatingState / snapSide は Undo しない
      }
    })
  },

  redo: () => {
    set((state) => {
      if (state.redoStack.length === 0) return state
      const next = state.redoStack[state.redoStack.length - 1]
      return {
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [
          ...state.undoStack,
          { currentColor: state.currentColor, previousColor: state.previousColor },
        ],
        currentColor: next.currentColor,
        previousColor: next.previousColor,
      }
    })
  },
}))
