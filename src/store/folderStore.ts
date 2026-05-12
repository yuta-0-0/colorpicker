import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/store/toastStore'
import type { Folder, FolderInsert, FolderUpdate } from '@/types/database'

interface FolderStore {
  folders: Folder[]
  loading: boolean
  error: string | null

  fetchFolders: () => Promise<void>
  createFolder: (name: string, parentId?: string | null) => Promise<Folder | null>
  renameFolder: (id: string, name: string) => Promise<void>
  updateFolder: (id: string, updates: FolderUpdate) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  toggleFolderLock: (id: string, isLocked: boolean) => Promise<void>
  reorderFolders: (orderedIds: string[]) => Promise<void>
}

export const useFolderStore = create<FolderStore>((set, get) => ({
  folders: [],
  loading: false,
  error: null,

  fetchFolders: async () => {
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      set({ loading: false })
      return
    }
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('order', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      useToastStore.getState().addToast('フォルダの取得に失敗しました。', 'error')
      return
    }
    set({ folders: data ?? [], loading: false })
  },

  createFolder: async (name, parentId = null) => {
    const maxOrder = get().folders.reduce((max, f) => Math.max(max, f.order), -1)

    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      const devFolder: Folder = {
        id: crypto.randomUUID(),
        user_id: 'dev-user',
        name,
        icon: null,
        parent_id: parentId ?? null,
        is_locked: false,
        order: maxOrder + 1,
        created_at: new Date().toISOString(),
      }
      set((state) => ({ folders: [...state.folders, devFolder] }))
      return devFolder
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const newFolder: FolderInsert = {
      user_id: user.id,
      name,
      parent_id: parentId,
      order: maxOrder + 1,
    }

    const { data, error } = await supabase
      .from('folders')
      .insert(newFolder)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      useToastStore.getState().addToast('フォルダの作成に失敗しました。', 'error')
      return null
    }

    set((state) => ({ folders: [...state.folders, data] }))
    return data
  },

  renameFolder: async (id, name) => {
    const { error } = await supabase
      .from('folders')
      .update({ name })
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, name } : f
      ),
    }))
  },

  updateFolder: async (id, updates) => {
    const { error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }
    set((state) => ({
      folders: state.folders.map((f) => f.id === id ? { ...f, ...updates } : f),
    }))
  },

  deleteFolder: async (id) => {
    // フォルダ削除時、中の色の folder_id は SET NULL（DBの ON DELETE SET NULL）
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
    }))
  },

  toggleFolderLock: async (id, isLocked) => {
    const { error } = await supabase
      .from('folders')
      .update({ is_locked: isLocked })
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, is_locked: isLocked } : f
      ),
    }))
  },

  reorderFolders: async (orderedIds) => {
    const previousFolders = get().folders
    set((state) => {
      const folderMap = new Map(state.folders.map((f) => [f.id, f]))
      const reordered = orderedIds
        .map((id) => folderMap.get(id))
        .filter((f): f is Folder => f !== undefined)
      return { folders: reordered }
    })

    let hasError = false
    for (const [index, id] of orderedIds.entries()) {
      const { error } = await supabase
        .from('folders')
        .update({ order: index })
        .eq('id', id)
      if (error) {
        hasError = true
        break
      }
    }

    if (hasError) {
      set({ folders: previousFolders, error: 'フォルダの並び替え保存に失敗しました' })
    }
  },
}))
