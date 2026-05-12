import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Tag } from '@/types/database'


interface TagStore {
  tags: Tag[]
  // colorId → Tag[] のマップ（詳細パネル・フィルターで使用）
  colorTags: Record<string, Tag[]>
  loading: boolean
  error: string | null

  // 全タグ取得（起動時に1回）
  fetchTags: () => Promise<void>

  // 新規タグ作成（同名があれば既存を返す）
  createTag: (name: string) => Promise<Tag | null>

  // タグ削除
  deleteTag: (id: string) => Promise<void>

  // タグ名を更新
  updateTag: (id: string, name: string) => Promise<void>

  // 全ユーザーのcolor_tagsを一括取得（起動時に1回・タグフィルター用）
  fetchAllColorTags: () => Promise<void>

  // 色のタグを取得（DetailPanel が開いたとき）
  fetchColorTags: (colorId: string) => Promise<void>

  // 色にタグを付与
  addTagToColor: (colorId: string, tagId: string) => Promise<void>

  // 色からタグを外す
  removeTagFromColor: (colorId: string, tagId: string) => Promise<void>
}

export const useTagStore = create<TagStore>((set, get) => ({
  tags: [],
  colorTags: {},
  loading: false,
  error: null,

  fetchTags: async () => {
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      set({ loading: false })
      return
    }
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ tags: (data as Tag[]) ?? [], loading: false })
  },

  createTag: async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return null

    // 同名タグが既に存在する場合は既存を返す
    const existing = get().tags.find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (existing) return existing

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('tags')
      .insert({ user_id: user.id, name: trimmed })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    const newTag = data as Tag
    set((state) => ({
      tags: [...state.tags, newTag].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    return newTag
  },

  deleteTag: async (id) => {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => {
      // colorTags からも削除
      const newColorTags = { ...state.colorTags }
      for (const colorId of Object.keys(newColorTags)) {
        newColorTags[colorId] = newColorTags[colorId].filter((t) => t.id !== id)
      }
      return {
        tags: state.tags.filter((t) => t.id !== id),
        colorTags: newColorTags,
      }
    })
  },

  updateTag: async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const { error } = await supabase
      .from('tags')
      .update({ name: trimmed })
      .eq('id', id)
    if (error) {
      set({ error: error.message })
      return
    }
    set((state) => ({
      tags: state.tags.map((t) => t.id === id ? { ...t, name: trimmed } : t),
      colorTags: Object.fromEntries(
        Object.entries(state.colorTags).map(([colorId, tags]) => [
          colorId,
          tags.map((t) => t.id === id ? { ...t, name: trimmed } : t),
        ])
      ),
    }))
  },

  fetchAllColorTags: async () => {
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') return
    const { data, error } = await supabase
      .from('color_tags')
      .select('color_id, tags(id, user_id, name)')

    if (error) {
      set({ error: error.message })
      return
    }

    const map: Record<string, Tag[]> = {}
    for (const row of (data ?? []) as { color_id: string; tags: Tag | Tag[] }[]) {
      if (!map[row.color_id]) map[row.color_id] = []
      if (Array.isArray(row.tags)) {
        map[row.color_id].push(...row.tags)
      } else if (row.tags) {
        map[row.color_id].push(row.tags)
      }
    }
    set({ colorTags: map })
  },

  fetchColorTags: async (colorId) => {
    const { data, error } = await supabase
      .from('color_tags')
      .select('tag_id, tags(id, user_id, name)')
      .eq('color_id', colorId)

    if (error) {
      set({ error: error.message })
      return
    }

    // Supabase join result: [{ tag_id, tags: { id, user_id, name } }]
    const fetched: Tag[] = (data ?? [])
      .map((row: { tags: Tag }) => row.tags)
      .filter(Boolean)

    set((state) => ({
      colorTags: { ...state.colorTags, [colorId]: fetched },
    }))
  },

  addTagToColor: async (colorId, tagId) => {
    // 楽観的更新
    const tag = get().tags.find((t) => t.id === tagId)
    if (!tag) return

    const currentTags = get().colorTags[colorId] ?? []
    if (currentTags.some((t) => t.id === tagId)) return // 重複防止

    set((state) => ({
      colorTags: {
        ...state.colorTags,
        [colorId]: [...(state.colorTags[colorId] ?? []), tag],
      },
    }))

    const { error } = await supabase
      .from('color_tags')
      .insert({ color_id: colorId, tag_id: tagId })

    if (error) {
      // ロールバック
      set((state) => ({
        colorTags: {
          ...state.colorTags,
          [colorId]: (state.colorTags[colorId] ?? []).filter((t) => t.id !== tagId),
        },
        error: error.message,
      }))
    }
  },

  removeTagFromColor: async (colorId, tagId) => {
    // 楽観的更新
    const previousTags = get().colorTags[colorId] ?? []

    set((state) => ({
      colorTags: {
        ...state.colorTags,
        [colorId]: (state.colorTags[colorId] ?? []).filter((t) => t.id !== tagId),
      },
    }))

    const { error } = await supabase
      .from('color_tags')
      .delete()
      .eq('color_id', colorId)
      .eq('tag_id', tagId)

    if (error) {
      // ロールバック
      set((state) => ({
        colorTags: { ...state.colorTags, [colorId]: previousTags },
        error: error.message,
      }))
    }
  },
}))
