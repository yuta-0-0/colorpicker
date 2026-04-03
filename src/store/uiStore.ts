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
}))
