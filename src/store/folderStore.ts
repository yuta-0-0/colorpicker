import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/store/toastStore'
import type { Folder, FolderInsert } from '@/types/database'

interface FolderStore {
  folders: Folder[]
  loading: boolean
  error: string | null

  fetchFolders: () => Promise<void>
  createFolder: (name: string) => Promise<Folder | null>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  toggleFolderLock: (id: string, isLocked: boolean) => Promise<void>
  reorderFolders: (orderedIds: string[]) => Promise<void>
}

export const useFolderStore = create<FolderStore>((set, get) => ({
  folders: [],
  loading: false,
  error: null,

  fetchFolders: async () => {
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

  createFolder: async (name) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const maxOrder = get().folders.reduce((max, f) => Math.max(max, f.order), -1)
    const newFolder: FolderInsert = {
      user_id: user.id,
      name,
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
