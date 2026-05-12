/**
 * memoryStore.ts
 *
 * PERSISTENCE LAYER — 永続化のみ
 *
 * 責務（唯一）：
 *   Commit フェーズ。判断済みの色を Supabase に書き込む。
 *   読み書きの窓口であり、判断・比較・UI は一切行わない。
 *
 * データフロー：
 *   ephemeralStore（Capture）
 *     → workspaceStore（Intent）
 *       → memoryStore（Commit）← ここ
 *         → Supabase（永続）
 *
 * 制約（全て絶対）：
 *   - UI 操作 禁止
 *   - 判断ロジック 禁止
 *   - toast 直接呼び出し 禁止（eventBus 経由のみ）
 *   - キャッシュ管理 禁止
 *   - addColor（取得と保存の混線） 禁止
 *   - workspaceStore / ephemeralStore への接続 禁止
 *
 * 副作用：eventBus への publish のみ許可
 *   成功 → color:committed
 *   失敗 → color:rejected
 */

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { eventBus } from '@/lib/eventBus'
import type { Color, ColorInsert, ColorUpdate } from '@/types/database'

interface MemoryState {
  // ── 永続データ ────────────────────────────────────────────────────
  colors: Color[]
  loading: boolean
  error: string | null

  // ── データ取得 ────────────────────────────────────────────────────
  fetchColors: (folderId?: string | null) => Promise<void>

  // ── Commit フェーズ（addColor 廃止。取得と保存の混線を解消）──────
  /**
   * saveColor — 唯一の保存入口
   *
   * 前提：呼び出し元はすでに「保存する」という意思決定を完了している。
   * - 重複 HEX は updated_at 更新でリスト最上部へ（上書き保存）
   * - 成功 → eventBus: color:committed
   * - 失敗 → eventBus: color:rejected
   */
  saveColor: (
    hex: string,
    opts?: { alpha?: number; folderId?: string | null; name?: string; memo?: string }
  ) => Promise<Color | null>

  // ── 色操作 ────────────────────────────────────────────────────────
  updateColor: (id: string, updates: ColorUpdate) => Promise<void>
  deleteColor: (id: string) => Promise<void>
  incrementUsedCount: (id: string) => Promise<void>
  reorderColors: (orderedIds: string[]) => Promise<void>

  // ── ゴミ箱 ────────────────────────────────────────────────────────
  trashColor: (id: string) => Promise<void>
  restoreColor: (id: string) => Promise<void>
  permanentlyDeleteColor: (id: string) => Promise<void>
  fetchTrashedColors: () => Promise<void>

  // ── color_folders（多対多）────────────────────────────────────────
  addColorToFolder: (colorId: string, folderId: string) => Promise<void>
  removeColorFromFolder: (colorId: string, folderId: string) => Promise<void>
  fetchColorsByFolder: (folderId: string) => Promise<void>

  // ── 初期シード ────────────────────────────────────────────────────
  seedDefaultColors: () => Promise<void>
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  colors: [],
  loading: false,
  error: null,

  // ── データ取得 ────────────────────────────────────────────────────
  fetchColors: async (_folderId) => {
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      set({ loading: false })
      return
    }
    const folderId = _folderId
    set({ loading: true, error: null })
    try {
      let query = supabase
        .from('colors')
        .select('*')
        .order('order', { ascending: true })
        .order('updated_at', { ascending: false })

      query = query.eq('is_trashed', false)

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

  // ── Commit フェーズ ───────────────────────────────────────────────
  saveColor: async (hex, opts = {}) => {
    const { alpha = 1.0, folderId = null, name, memo } = opts

    // dev bypass モード: Supabase を使わずローカル state のみ
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      const existing = get().colors.find((c) => c.hex.toUpperCase() === hex.toUpperCase())
      if (existing) return existing
      const devColor: Color = {
        id: crypto.randomUUID(),
        user_id: 'dev-user',
        folder_id: folderId,
        hex: hex.toUpperCase(),
        alpha,
        name: name ?? hex.toUpperCase(),
        order: 0,
        is_favorite: false,
        is_locked: false,
        is_archived: false,
        is_trashed: false,
        used_count: 0,
        last_used_at: null,
        memo: null,
        spot_color: null,
        c: null, m: null, y: null, k: null,
        cmyk_source: null,
        cmyk_profile: null,
        trashed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      set((state) => ({ colors: [devColor, ...state.colors] }))
      eventBus.publish({ type: 'color:committed', payload: { id: devColor.id, hex: devColor.hex } })
      return devColor
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 同一 HEX が既に存在するか確認（上書き保存 = リスト最上部へ）
    const existing = get().colors.find((c) => c.hex.toUpperCase() === hex.toUpperCase())
    if (existing) {
      const { error } = await supabase
        .from('colors')
        .update({ updated_at: new Date().toISOString(), order: -1 })
        .eq('id', existing.id)
      if (!error) {
        await get().fetchColors(folderId)
      }
      eventBus.publish({ type: 'color:committed', payload: { id: existing.id, hex: existing.hex } })
      return existing
    }

    // 新規保存
    const colorName = name ?? hex.toUpperCase()
    const newColor: ColorInsert = {
      user_id: user.id,
      folder_id: folderId,
      hex: hex.toUpperCase(),
      alpha,
      name: colorName,
      memo: memo ?? null,
      order: 0,
    }

    const { data, error } = await supabase
      .from('colors')
      .insert(newColor)
      .select()
      .single()

    if (error) {
      const reason = (error.message as string).includes('COLOR_LIMIT_EXCEEDED')
        ? '保存できる色の上限（500色）に達しています'
        : 'ネットワークエラー。オンライン復帰時に再試行してください。'
      set({ error: reason })
      eventBus.publish({ type: 'color:rejected', payload: { reason } })
      return null
    }

    set((state) => ({ colors: [data as Color, ...state.colors] }))
    eventBus.publish({ type: 'color:committed', payload: { id: (data as Color).id, hex: (data as Color).hex } })
    return data as Color
  },

  // ── 色操作 ────────────────────────────────────────────────────────
  updateColor: async (id, updates) => {
    const { error } = await supabase
      .from('colors')
      .update(updates)
      .eq('id', id)

    if (error) {
      const message = 'ネットワークエラー。オンライン復帰時に再試行してください。'
      set({ error: message })
      eventBus.publish({ type: 'color:error', payload: { message } })
      return
    }

    set((state) => ({
      colors: state.colors.map((c) => c.id === id ? { ...c, ...updates } : c),
    }))
  },

  deleteColor: async (id) => {
    const { error } = await supabase
      .from('colors')
      .delete()
      .eq('id', id)

    if (error) {
      const message = 'ネットワークエラー。オンライン復帰時に再試行してください。'
      set({ error: message })
      eventBus.publish({ type: 'color:error', payload: { message } })
      return
    }

    set((state) => ({ colors: state.colors.filter((c) => c.id !== id) }))
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
    const previousColors = get().colors
    set((state) => {
      const colorMap = new Map(state.colors.map((c) => [c.id, c]))
      const reordered = orderedIds
        .map((id) => colorMap.get(id))
        .filter((c): c is Color => c !== undefined)
      return { colors: reordered }
    })

    let hasError = false
    for (const [index, id] of orderedIds.entries()) {
      const { error } = await supabase
        .from('colors')
        .update({ order: index })
        .eq('id', id)
      if (error) { hasError = true; break }
    }

    if (hasError) {
      set({ colors: previousColors, error: '並び替えの保存に失敗しました' })
    }
  },

  // ── ゴミ箱 ────────────────────────────────────────────────────────
  trashColor: async (id) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('colors')
      .update({ is_trashed: true, trashed_at: now })
      .eq('id', id)

    if (error) {
      eventBus.publish({ type: 'color:error', payload: { message: 'ゴミ箱への移動に失敗しました。' } })
      return
    }
    set((state) => ({ colors: state.colors.filter((c) => c.id !== id) }))
    eventBus.publish({ type: 'color:trashed', payload: { id } })
  },

  restoreColor: async (id) => {
    const { error } = await supabase
      .from('colors')
      .update({ is_trashed: false, trashed_at: null })
      .eq('id', id)

    if (error) {
      eventBus.publish({ type: 'color:error', payload: { message: '元に戻すのに失敗しました。' } })
      return
    }
    set((state) => ({ colors: state.colors.filter((c) => c.id !== id) }))
    eventBus.publish({ type: 'color:restored', payload: { id } })
  },

  permanentlyDeleteColor: async (id) => {
    const { error } = await supabase
      .from('colors')
      .delete()
      .eq('id', id)

    if (error) {
      eventBus.publish({ type: 'color:error', payload: { message: '完全削除に失敗しました。' } })
      return
    }
    set((state) => ({ colors: state.colors.filter((c) => c.id !== id) }))
  },

  fetchTrashedColors: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('colors')
      .select('*')
      .eq('is_trashed', true)
      .order('trashed_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ colors: (data as Color[]) ?? [], loading: false })
  },

  // ── color_folders（多対多）────────────────────────────────────────
  addColorToFolder: async (colorId, folderId) => {
    const { error } = await supabase
      .from('color_folders')
      .insert({ color_id: colorId, folder_id: folderId })

    if (error && !error.message.includes('duplicate')) {
      eventBus.publish({ type: 'color:error', payload: { message: 'フォルダへの追加に失敗しました。' } })
    }
  },

  removeColorFromFolder: async (colorId, folderId) => {
    const { error } = await supabase
      .from('color_folders')
      .delete()
      .eq('color_id', colorId)
      .eq('folder_id', folderId)

    if (error) {
      eventBus.publish({ type: 'color:error', payload: { message: 'フォルダからの削除に失敗しました。' } })
    }
  },

  fetchColorsByFolder: async (folderId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('color_folders')
      .select('colors(*)')
      .eq('folder_id', folderId)

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    const colors = (data ?? [])
      .map((row) => (row as { colors: Color | null }).colors)
      .filter((c): c is Color => c !== null && !c.is_trashed)
    set({ colors, loading: false })
  },

  // ── 初期シード ────────────────────────────────────────────────────
  seedDefaultColors: async () => {
    if (localStorage.getItem('colorpicker_defaults_seeded')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const color = await get().saveColor('#000000', { alpha: 1.0, folderId: null, name: 'リッチブラック' })
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
