import { create } from 'zustand'

export type ViewMode = 'list' | 'gallery'
export type NavSection = 'all' | 'favorites' | 'history' | 'generator'

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
  clearBulkSelect: () => void
  isBulkMode: boolean

  // 検索フォーカス
  searchFocusTrigger: number
  triggerSearchFocus: () => void

  // フォルダ追加
  isAddingFolder: boolean
  setIsAddingFolder: (v: boolean) => void
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
  clearBulkSelect: () => set({ bulkSelectedIds: [], isBulkMode: false }),

  // 検索フォーカス
  searchFocusTrigger: 0,
  triggerSearchFocus: () => set((s) => ({ searchFocusTrigger: s.searchFocusTrigger + 1 })),

  // フォルダ追加
  isAddingFolder: false,
  setIsAddingFolder: (v) => set({ isAddingFolder: v }),
}))
