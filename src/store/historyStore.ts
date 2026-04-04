import { create } from 'zustand'
import {
  addToHistory as dbAddToHistory,
  getHistory,
  clearHistory as dbClearHistory,
  type HistoryColor,
} from '@/lib/historyDB'

interface HistoryStore {
  historyColors: HistoryColor[]
  loading: boolean

  /** IndexedDB から履歴を読み込む */
  loadHistory: () => Promise<void>

  /** 色を履歴に追加し、ストアを更新する */
  addToHistory: (hex: string, alpha?: number) => Promise<void>

  /** 履歴を全件削除する */
  clearHistory: () => Promise<void>
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  historyColors: [],
  loading: false,

  loadHistory: async () => {
    set({ loading: true })
    const colors = await getHistory()
    set({ historyColors: colors, loading: false })
  },

  addToHistory: async (hex, alpha = 1.0) => {
    await dbAddToHistory(hex, alpha)
    const colors = await getHistory()
    set({ historyColors: colors })
  },

  clearHistory: async () => {
    await dbClearHistory()
    set({ historyColors: [] })
  },
}))
