import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { getColorName } from '@/lib/colorUtils'
import type { Color, ColorInsert, ColorUpdate } from '@/types/database'

// supabase-js v2 の型推論を回避するためのユーティリティ
// Database 型のバージョン差異により .update() / .insert() の引数が never になる場合の対処
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface ColorStore {
  colors: Color[]
  loading: boolean
  error: string | null

  // データ取得
  fetchColors: (folderId?: string | null) => Promise<void>

  // 色追加（同一HEXは重複しない）
  addColor: (hex: string, alpha?: number, folderId?: string | null) => Promise<Color | null>

  // 色更新（名前・メモ・お気に入り・ロック・アーカイブ等）
  updateColor: (id: string, updates: ColorUpdate) => Promise<void>

  // 色削除
  deleteColor: (id: string) => Promise<void>

  // コピー時のused_count更新
  incrementUsedCount: (id: string) => Promise<void>

  // ドラッグ並び替え後の順序保存
  reorderColors: (orderedIds: string[]) => Promise<void>
}

export const useColorStore = create<ColorStore>((set, get) => ({
  colors: [],
  loading: false,
  error: null,

  fetchColors: async (folderId) => {
    set({ loading: true, error: null })
    try {
      let query = db
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

  addColor: async (hex, alpha = 1.0, folderId = null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 同一HEXが既に存在するか確認
    const existing = get().colors.find((c) => c.hex.toUpperCase() === hex.toUpperCase())
    if (existing) {
      // updated_atを更新してリスト最上部へ
      const { error } = await db
        .from('colors')
        .update({ updated_at: new Date().toISOString(), order: -1 })
        .eq('id', existing.id)
      if (!error) {
        await get().fetchColors(folderId)
      }
      return existing
    }

    // 新規追加
    const name = await getColorName(hex)
    const newColor: ColorInsert = {
      user_id: user.id,
      folder_id: folderId,
      hex: hex.toUpperCase(),
      alpha,
      name,
      order: 0,
    }

    const { data, error } = await db
      .from('colors')
      .insert(newColor)
      .select()
      .single()

    if (error) {
      if ((error.message as string).includes('COLOR_LIMIT_EXCEEDED')) {
        set({ error: '保存できる色の上限（500色）に達しています' })
      } else {
        set({ error: error.message as string })
      }
      return null
    }

    set((state) => ({ colors: [data as Color, ...state.colors] }))
    return data as Color
  },

  updateColor: async (id, updates) => {
    const { error } = await db
      .from('colors')
      .update(updates)
      .eq('id', id)

    if (error) {
      set({ error: (error.message as string) })
      return
    }

    set((state) => ({
      colors: state.colors.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }))
  },

  deleteColor: async (id) => {
    const { error } = await db
      .from('colors')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: (error.message as string) })
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
    const { error } = await db
      .from('colors')
      .update({ used_count: newCount, last_used_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      set((state) => ({
        colors: state.colors.map((c) =>
          c.id === id ? { ...c, used_count: newCount, last_used_at: new Date().toISOString() } : c
        ),
      }))
    }
  },

  reorderColors: async (orderedIds) => {
    // 楽観的更新：先にUIを更新
    set((state) => {
      const colorMap = new Map(state.colors.map((c) => [c.id, c]))
      const reordered = orderedIds
        .map((id) => colorMap.get(id))
        .filter((c): c is Color => c !== undefined)
      return { colors: reordered }
    })

    // Supabaseに順序を保存
    const updates = orderedIds.map((id, index) => ({
      id,
      order: index,
    }))

    for (const update of updates) {
      await db
        .from('colors')
        .update({ order: update.order })
        .eq('id', update.id)
    }
  },
}))
