import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ListView } from '@/components/views/ListView'
import { GalleryView } from '@/components/views/GalleryView'
import { ViewToggle } from '@/components/views/ViewToggle'
import { FilterBar } from '@/components/views/FilterBar'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { AddColorModal } from '@/components/color/AddColorModal'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useFolderStore } from '@/store/folderStore'

export function AppLayout() {
  const {
    viewMode,
    setViewMode,
    selectedColorId,
    isDetailPanelOpen,
    isSidebarOpen,
    setSidebarOpen,
    activeFolderId,
    activeSection,
  } = useUIStore()

  const { colors, loading: colorsLoading, fetchColors } = useColorStore()
  const { fetchFolders } = useFolderStore()
  const [showAddModal, setShowAddModal] = useState(false)

  // 初回データ取得
  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  // フォルダ・セクション変更時にデータ再取得
  useEffect(() => {
    if (activeSection === 'favorites') {
      fetchColors()
    } else {
      fetchColors(activeFolderId)
    }
  }, [activeFolderId, activeSection, fetchColors])

  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? null

  // お気に入りフィルター
  const displayColors = activeSection === 'favorites'
    ? colors.filter((c) => c.is_favorite)
    : colors

  const sectionTitle =
    activeSection === 'favorites' ? 'お気に入り' :
    activeSection === 'history' ? '最近使った色' :
    activeSection === 'generator' ? 'カラージェネレーター' :
    'すべての色'

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-text-primary">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={['fixed inset-y-0 left-0 z-30 transition-transform md:relative md:translate-x-0', isSidebarOpen ? 'translate-x-0' : '-translate-x-full'].join(' ')}>
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} type="button" className="md:hidden text-text-secondary hover:text-text-primary">☰</button>
          <h1 className="text-sm font-medium text-text-primary flex-1">{sectionTitle}</h1>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <button
            onClick={() => setShowAddModal(true)}
            type="button"
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
          >
            ＋ 追加
          </button>
        </header>

        <FilterBar />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {colorsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-text-muted text-sm">読み込み中...</p>
              </div>
            ) : viewMode === 'list' ? (
              <ListView colors={displayColors} />
            ) : (
              <GalleryView colors={displayColors} />
            )}
          </div>
          {isDetailPanelOpen && selectedColor && (
            <DetailPanel color={selectedColor} />
          )}
        </div>
      </div>

      {showAddModal && <AddColorModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
