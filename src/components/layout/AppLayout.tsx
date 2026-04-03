import { Sidebar } from '@/components/sidebar/Sidebar'
import { ListView } from '@/components/views/ListView'
import { GalleryView } from '@/components/views/GalleryView'
import { ViewToggle } from '@/components/views/ViewToggle'
import { FilterBar } from '@/components/views/FilterBar'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { useUIStore } from '@/store/uiStore'
import { MOCK_COLORS } from '@/mock/colors'

export function AppLayout() {
  const {
    viewMode,
    setViewMode,
    selectedColorId,
    isDetailPanelOpen,
    isSidebarOpen,
    setSidebarOpen,
  } = useUIStore()

  const selectedColor = MOCK_COLORS.find((c) => c.id === selectedColorId) ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-text-primary">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={[
          'fixed inset-y-0 left-0 z-30 transition-transform md:relative md:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            type="button"
            className="md:hidden text-text-secondary hover:text-text-primary"
          >
            ☰
          </button>
          <h1 className="text-sm font-medium text-text-primary flex-1">すべての色</h1>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <button
            type="button"
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
          >
            ＋ 追加
          </button>
        </header>

        <FilterBar />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {viewMode === 'list' ? (
              <ListView colors={MOCK_COLORS} />
            ) : (
              <GalleryView colors={MOCK_COLORS} />
            )}
          </div>
          {isDetailPanelOpen && selectedColor && (
            <DetailPanel color={selectedColor} />
          )}
        </div>
      </div>
    </div>
  )
}
