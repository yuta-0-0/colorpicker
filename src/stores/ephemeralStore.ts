/**
 * ephemeralStore.ts
 *
 * EPHEMERAL STATE — 取得 ≠ 保存 の物理構造
 *
 * 責務：
 *   取得 / 比較 / 瞬間UI / 短期残響 のみを扱う
 *
 * 制約（全て絶対）：
 *   - Supabase 永続化 禁止
 *   - memoryStore 接続 禁止
 *   - auto save 禁止
 *   - favorite 昇格 禁止
 *   - usedCount 加算 禁止
 *   - toastStore 直接呼び出し 禁止
 *
 * アプリ終了時に忘却されることが前提。
 */

import { create } from 'zustand'
import {
  addToHistory as dbAddToHistory,
  getHistory,
  clearHistory as dbClearHistory,
  type HistoryColor,
} from '@/lib/historyDB'

interface EphemeralState {
  // ── スポイト・取得系 ─────────────────────────────────────────────────
  /**
   * capturePreviewColor で受け取る超短命 preview 色。
   * hover / eye movement 中のみ存在。history 追加禁止。
   */
  previewColor: string | null

  /**
   * スポイトボタン: pointerDown で true / pick 完了 or cancel で false
   * 「取得動作中」を示すフラグ。保存とは無関係。
   */
  eyeActive: boolean

  // ── 取得残響（保存履歴ではない）────────────────────────────────────
  /**
   * IndexedDB に保存された取得残響。max 50件 FIFO。
   * 「保存した色」ではなく「取得した色の痕跡」。
   * usedCount 加算禁止 / favorite 化禁止 / memory 昇格禁止。
   */
  historyColors: HistoryColor[]
  historyLoading: boolean

  // ── 瞬間 UI フラグ ──────────────────────────────────────────────────
  /** スポイト後に自動保存するかどうかのフラグ（長押し判定で true） */
  pendingSaveAfterPick: boolean

  /** HeroDot ダブルクリック後、FloatingTab マウント時に Explosion を発火するフラグ */
  explosionPending: boolean

  /** 保存フラッシュ: HeroDot がアクセントカラーに一瞬光る（視覚残響） */
  saveFlash: boolean

  // ── Hover 状態（視覚フィードバック用）──────────────────────────────
  /**
   * FloatingTab ドット上にマウスが乗っている。
   * HeroDot の scale アニメーション（1.1）用。
   * workspaceStore には置かない（判断と無関係な純粋な身体反応）。
   */
  isDotHovered: boolean

  // ── エラー（瞬間異常状態）──────────────────────────────────────────
  /**
   * 最新のエラー文字列。
   * UI 側が検知して toast を表示する。このストアは toast を直接呼ばない。
   */
  lastError: string | null

  // ── Actions ─────────────────────────────────────────────────────────

  /**
   * capturePreviewColor
   * スポイト移動中 / hover 中の超短命 preview 状態をセット。
   * - history 追加禁止
   * - memory 接続禁止
   * - 永続化禁止
   */
  capturePreviewColor: (hex: string | null) => void

  /**
   * commitCapturedColor
   * ユーザーが「この色を拾う」と確定した瞬間。
   * - historyColors（取得残響）に追加
   * - memoryStore への自動接続禁止
   * - commit ≠ save
   */
  commitCapturedColor: (hex: string, alpha?: number) => Promise<void>

  /**
   * addToHistory
   * commitCapturedColor の互換エイリアス。
   * 既存コンポーネントの段階移行中に使用。
   * 意味は「取得残響として記録」であり「保存」ではない。
   */
  addToHistory: (hex: string, alpha?: number) => Promise<void>

  setEyeActive: (v: boolean) => void
  setPendingSaveAfterPick: (v: boolean) => void
  setExplosionPending: (v: boolean) => void
  setSaveFlash: (v: boolean) => void
  setDotHovered: (v: boolean) => void
  setLastError: (error: string | null) => void

  /** IndexedDB から取得残響を読み込む */
  loadHistory: () => Promise<void>
  /** 取得残響を全件消去（記憶ではないため消去可能） */
  clearHistory: () => Promise<void>
}

export const useEphemeralStore = create<EphemeralState>((set) => ({
  previewColor: null,
  eyeActive: false,
  historyColors: [],
  historyLoading: false,
  pendingSaveAfterPick: false,
  explosionPending: false,
  saveFlash: false,
  isDotHovered: false,
  lastError: null,

  capturePreviewColor: (hex) => set({ previewColor: hex }),

  commitCapturedColor: async (hex, alpha = 1.0) => {
    // 取得残響として IndexedDB に記録するのみ
    // memoryStore への接続禁止 / Supabase 永続化禁止
    await dbAddToHistory(hex, alpha)
    const colors = await getHistory()
    set({ historyColors: colors })
  },

  addToHistory: async (hex, alpha = 1.0) => {
    // commitCapturedColor の互換エイリアス
    await dbAddToHistory(hex, alpha)
    const colors = await getHistory()
    set({ historyColors: colors })
  },

  setEyeActive: (eyeActive) => set({ eyeActive }),
  setPendingSaveAfterPick: (pendingSaveAfterPick) => set({ pendingSaveAfterPick }),
  setExplosionPending: (explosionPending) => set({ explosionPending }),
  setSaveFlash: (saveFlash) => set({ saveFlash }),
  setDotHovered: (isDotHovered) => set({ isDotHovered }),
  setLastError: (lastError) => set({ lastError }),

  loadHistory: async () => {
    set({ historyLoading: true })
    const colors = await getHistory()
    set({ historyColors: colors, historyLoading: false })
  },

  clearHistory: async () => {
    await dbClearHistory()
    set({ historyColors: [] })
  },
}))
