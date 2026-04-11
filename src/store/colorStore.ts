import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/store/toastStore'
import type { Color, ColorInsert, ColorUpdate } from '@/types/database'


interface ColorStore {
  colors: Color[]
  loading: boolean
  error: string | null

  // Undo/Redo スタック（最大20スナップショット）
  undoStack: Color[][]
  redoStack: Color[][]

  // データ取得
  fetchColors: (folderId?: string | null) => Promise<void>

  // 色追加（同一HEXは重複しない）
  addColor: (hex: string, alpha?: number, folderId?: string | null, options?: { name?: string }) => Promise<Color | null>

  // 初回ログイン時のデフォルト色シード
  seedDefaultColors: () => Promise<void>

  // 色更新（名前・メモ・お気に入り・ロック・アーカイブ等）
  updateColor: (id: string, updates: ColorUpdate) => Promise<void>

  // 色削除
  deleteColor: (id: string) => Promise<void>

  // コピー時のused_count更新
  incrementUsedCount: (id: string) => Promise<void>

  // ドラッグ並び替え後の順序保存
  reorderColors: (orderedIds: string[]) => Promise<void>

  // Undo/Redo
  undo: () => void
  redo: () => void

  // 変更前スナップショット（内部ヘルパー）
  _snapshot: () => void
}

export const useColorStore = create<ColorStore>((set, get) => ({
  colors: [],
  loading: false,
  error: null,
  undoStack: [],
  redoStack: [],

  _snapshot: () => {
    set((state) => ({
      undoStack: [...state.undoStack.slice(-19), [...state.colors]],
      redoStack: [], // 新しい変更でやり直しスタックをクリア
    }))
  },

  undo: () => {
    set((state) => {
      if (state.undoStack.length === 0) return state
      const prev = state.undoStack[state.undoStack.length - 1]
      return {
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, [...state.colors]],
        colors: prev,
      }
    })
  },

  redo: () => {
    set((state) => {
      if (state.redoStack.length === 0) return state
      const next = state.redoStack[state.redoStack.length - 1]
      return {
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, [...state.colors]],
        colors: next,
      }
    })
  },

  fetchColors: async (folderId) => {
    set({ loading: true, error: null })
    try {
      let query = supabase
        .from('colors')
        .select('*')
        .order('order', { ascending: true })
        .order('updated_at', { ascending: false })

      if (folderId !== undefined) {
        if (folderId === null) {
          query = query.is('folder_id', null)
        } else {
          query = query.eq('folder_id', folderId)
        }
      }

      const { data, error } = await query
      if (error) throw error

      set({ colors: (data as Color[]) ?? [], loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  addColor: async (hex, alpha = 1.0, folderId = null, options) => {
    get()._snapshot()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 同一HEXが既に存在するか確認
    const existing = get().colors.find((c) => c.hex.toUpperCase() === hex.toUpperCase())
    if (existing) {
      // updated_atを更新してリスト最上部へ
      const { error } = await supabase
        .from('colors')
        .update({ updated_at: new Date().toISOString(), order: -1 })
        .eq('id', existing.id)
      if (!error) {
        await get().fetchColors(folderId)
      }
      return existing
    }

    // 新規追加（デフォルト名はHEXコード）
    const name = options?.name ?? hex.toUpperCase()
    const newColor: ColorInsert = {
      user_id: user.id,
      folder_id: folderId,
      hex: hex.toUpperCase(),
      alpha,
      name,
      order: 0,
    }

    const { data, error } = await supabase
      .from('colors')
      .insert(newColor)
      .select()
      .single()

    if (error) {
      const message = (error.message as string).includes('COLOR_LIMIT_EXCEEDED')
        ? '保存できる色の上限（500色）に達しています'
        : 'ネットワークエラー。オンライン復帰時に再試行してください。'
      set({ error: message })
      useToastStore.getState().addToast(message, 'error')
      return null
    }

    set((state) => ({ colors: [data as Color, ...state.colors] }))
    return data as Color
  },

  updateColor: async (id, updates) => {
    get()._snapshot()
    const { error } = await supabase
      .from('colors')
      .update(updates)
      .eq('id', id)

    if (error) {
      const message = 'ネットワークエラー。オンライン復帰時に再試行してください。'
      set({ error: message })
      useToastStore.getState().addToast(message, 'error')
      return
    }

    set((state) => ({
      colors: state.colors.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }))
  },

  deleteColor: async (id) => {
    get()._snapshot()
    const { error } = await supabase
      .from('colors')
      .delete()
      .eq('id', id)

    if (error) {
      const message = 'ネットワークエラー。オンライン復帰時に再試行してください。'
      set({ error: message })
      useToastStore.getState().addToast(message, 'error')
      return
    }

    set((state) => ({
      colors: state.colors.filter((c) => c.id !== id),
    }))
  },

  incrementUsedCount: async (id) => {
    const color = get().colors.find((c) => c.id === id)
    if (!color) return

    const newCount = color.used_count + 1
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('colors')
      .update({ used_count: newCount, last_used_at: now })
      .eq('id', id)

    if (!error) {
      set((state) => ({
        colors: state.colors.map((c) =>
          c.id === id ? { ...c, used_count: newCount, last_used_at: now } : c
        ),
      }))
    }
  },

  reorderColors: async (orderedIds) => {
    get()._snapshot()
    // 楽観的更新：先にUIを更新（ロールバック用に元の状態を保存）
    const previousColors = get().colors
    set((state) => {
      const colorMap = new Map(state.colors.map((c) => [c.id, c]))
      const reordered = orderedIds
        .map((id) => colorMap.get(id))
        .filter((c): c is Color => c !== undefined)
      return { colors: reordered }
    })

    // Supabaseに順序を保存
    let hasError = false
    for (const [index, id] of orderedIds.entries()) {
      const { error } = await supabase
        .from('colors')
        .update({ order: index })
        .eq('id', id)
      if (error) {
        hasError = true
        break
      }
    }

    if (hasError) {
      set({ colors: previousColors, error: '並び替えの保存に失敗しました' })
    }
  },

  seedDefaultColors: async () => {
    if (localStorage.getItem('colorpicker_defaults_seeded')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const color = await get().addColor('#000000', 1.0, null, { name: 'リッチブラック' })
    if (color) {
      await supabase.from('colors')
        .update({ c: 60, m: 40, y: 40, k: 100, cmyk_source: 'print_spec' })
        .eq('id', color.id)
      set((state) => ({
        colors: state.colors.map((c) =>
          c.id === color.id ? { ...c, c: 60, m: 40, y: 40, k: 100, cmyk_source: 'print_spec' } : c
        ),
      }))
    }
    localStorage.setItem('colorpicker_defaults_seeded', 'true')
  },
}))
