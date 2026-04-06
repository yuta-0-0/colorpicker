import { create } from 'zustand'

export type ViewMode = 'list' | 'gallery'
export type NavSection = 'all' | 'favorites' | 'history' | 'generator' | 'ui-test'

interface UIStore {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  selectedColorId: string | null
  setSelectedColorId: (id: string | null) => void

  isDetailPanelOpen: boolean
  setIsDetailPanelOpen: (open: boolean) => void

  isSidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  activeSection: NavSection
  setActiveSection: (section: NavSection) => void

  activeFolderId: string | null
  setActiveFolderId: (id: string | null) => void

  showArchived: boolean
  setShowArchived: (show: boolean) => void

  // 色相フィルター
  activeHueFilter: string | null
  setActiveHueFilter: (hue: string | null) => void

  // バルク選択
  bulkSelectedIds: string[]
  toggleBulkSelect: (id: string) => void
  setBulkSelectedIds: (ids: string[]) => void
  clearBulkSelect: () => void
  isBulkMode: boolean

  // 検索フォーカス
  searchFocusTrigger: number
  triggerSearchFocus: () => void

  // フォルダ追加
  isAddingFolder: boolean
  setIsAddingFolder: (v: boolean) => void

  // 検索
  searchQuery: string
  setSearchQuery: (q: string) => void

  // タグ絞り込み
  activeTagId: string | null
  setActiveTagId: (id: string | null) => void

  // ソート
  sortBy: 'order' | 'used_count' | 'hue' | 'tone'
  setSortBy: (sort: 'order' | 'used_count' | 'hue' | 'tone') => void
  sortDirection: 'asc' | 'desc'
  toggleSortDirection: () => void

  // 伝統色フィルター（伝統色が割り当てられている色のみ表示）
  activeTraditionalFilter: boolean
  setActiveTraditionalFilter: (active: boolean) => void

  // テーマ
  theme: 'dark' | 'light' | 'system'
  setTheme: (theme: 'dark' | 'light' | 'system') => void
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),

  selectedColorId: null,
  setSelectedColorId: (id) => set({ selectedColorId: id, isDetailPanelOpen: id !== null }),

  isDetailPanelOpen: false,
  setIsDetailPanelOpen: (open) => set({ isDetailPanelOpen: open }),

  isSidebarOpen: false,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  activeSection: 'all',
  setActiveSection: (section) => set({ activeSection: section, activeFolderId: null }),

  activeFolderId: null,
  setActiveFolderId: (id) => set({ activeFolderId: id, activeSection: 'all' }),

  showArchived: false,
  setShowArchived: (show) => set({ showArchived: show }),

  // 色相フィルター
  activeHueFilter: null,
  setActiveHueFilter: (hue) => set({ activeHueFilter: hue }),

  // バルク選択
  bulkSelectedIds: [],
  isBulkMode: false,
  toggleBulkSelect: (id) =>
    set((state) => {
      const exists = state.bulkSelectedIds.includes(id)
      const next = exists
        ? state.bulkSelectedIds.filter((x) => x !== id)
        : [...state.bulkSelectedIds, id]
      return { bulkSelectedIds: next, isBulkMode: next.length > 0 }
    }),
  setBulkSelectedIds: (ids) => set({ bulkSelectedIds: ids, isBulkMode: ids.length > 0 }),
  clearBulkSelect: () => set({ bulkSelectedIds: [], isBulkMode: false }),

  // 検索フォーカス
  searchFocusTrigger: 0,
  triggerSearchFocus: () => set((s) => ({ searchFocusTrigger: s.searchFocusTrigger + 1 })),

  // フォルダ追加
  isAddingFolder: false,
  setIsAddingFolder: (v) => set({ isAddingFolder: v }),

  // 検索
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // タグ絞り込み
  activeTagId: null,
  setActiveTagId: (id) => set({ activeTagId: id }),

  // ソート
  sortBy: 'order',
  setSortBy: (sort) => set({ sortBy: sort }),
  sortDirection: 'asc',
  toggleSortDirection: () => set((s) => ({ sortDirection: s.sortDirection === 'asc' ? 'desc' : 'asc' })),

  // 伝統色フィルター
  activeTraditionalFilter: false,
  setActiveTraditionalFilter: (active) => set({ activeTraditionalFilter: active }),

  // テーマ
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}))
