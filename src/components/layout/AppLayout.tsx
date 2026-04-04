import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ListView } from '@/components/views/ListView'
import { GalleryView } from '@/components/views/GalleryView'
import { ViewToggle } from '@/components/views/ViewToggle'
import { FilterBar } from '@/components/views/FilterBar'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { AddColorModal } from '@/components/color/AddColorModal'
import { AddMenuPopover } from '@/components/color/AddMenuPopover'
import { ImagePickerModal } from '@/components/color/ImagePickerModal'
import { BulkActionBar } from '@/components/ui/BulkActionBar'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useFolderStore } from '@/store/folderStore'

// 色相カテゴリを返す（FilterBar の HUE_FILTERS ラベルと一致させる）
function getHueCategory(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const s = max === 0 ? 0 : (max - min) / max
  if (s < 0.12) return '無彩色'
  const d = max - min
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = Math.round(h * 60 + (h < 0 ? 360 : 0))
  if (h < 20 || h >= 340) return '赤'
  if (h < 45) return '橙'
  if (h < 70) return '黄'
  if (h < 160) return '緑'
  if (h < 250) return '青'
  if (h < 290) return '紫'
  return 'ピンク'
}

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
    activeHueFilter,
    isBulkMode,
  } = useUIStore()

  const { colors, loading: colorsLoading, fetchColors, addColor } = useColorStore()
  const { fetchFolders } = useFolderStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)

  const handleCloseMenu = useCallback(() => setShowMenu(false), [])

  const handleScreenPick = useCallback(async () => {
    setShowMenu(false)
    try {
      const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper()
      const { sRGBHex } = await eyeDropper.open()
      await addColor(sRGBHex, 1.0, activeFolderId)
    } catch {
      // ユーザーキャンセルは無視
    }
  }, [addColor, activeFolderId])

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

  // お気に入りフィルター → 色相フィルター の順に適用
  const baseColors = activeSection === 'favorites'
    ? colors.filter((c) => c.is_favorite)
    : colors

  const displayColors = activeHueFilter
    ? baseColors.filter((c) => getHueCategory(c.hex) === activeHueFilter)
    : baseColors

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
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              type="button"
              className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
            >
              ＋ 追加
            </button>
            {showMenu && (
              <AddMenuPopover
                onSelectText={() => setShowAddModal(true)}
                onSelectImage={() => setShowImageModal(true)}
                onSelectScreen={handleScreenPick}
                onClose={handleCloseMenu}
              />
            )}
          </div>
        </header>

        <FilterBar />

        <div className="flex-1 flex flex-col overflow-hidden">
          {isBulkMode && <BulkActionBar />}

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
      </div>

      {showAddModal && <AddColorModal onClose={() => setShowAddModal(false)} />}
      {showImageModal && <ImagePickerModal onClose={() => setShowImageModal(false)} />}
    </div>
  )
}
