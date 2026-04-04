import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ListView } from '@/components/views/ListView'
import { GalleryView } from '@/components/views/GalleryView'
import { GeneratorView } from '@/components/generator/GeneratorView'
import { ViewToggle } from '@/components/views/ViewToggle'
import { FilterBar } from '@/components/views/FilterBar'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { AddColorModal } from '@/components/color/AddColorModal'
import { AddMenuPopover } from '@/components/color/AddMenuPopover'
import { ImagePickerModal } from '@/components/color/ImagePickerModal'
import { BulkActionBar } from '@/components/ui/BulkActionBar'
import { VisualExportModal } from '@/components/export/VisualExportModal'
import { PaletteExportModal } from '@/components/export/PaletteExportModal'
import { ImportModal } from '@/components/export/ImportModal'
import { useUIStore } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useFolderStore } from '@/store/folderStore'
import { useTagStore } from '@/store/tagStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { downloadAllDataJSON } from '@/lib/exportUtils'
import { useHistoryStore } from '@/store/historyStore'

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
    searchQuery,
    activeTagId,
    sortBy,
  } = useUIStore()

  const { colors, loading: colorsLoading, fetchColors, addColor } = useColorStore()
  const { fetchFolders, folders } = useFolderStore()
  const { fetchTags, fetchAllColorTags, colorTags } = useTagStore()
  const { addToHistory: addColorToHistory } = useHistoryStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showVisualExport, setShowVisualExport] = useState(false)
  const [showPaletteExport, setShowPaletteExport] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const handleCloseMenu = useCallback(() => setShowMenu(false), [])

  const handleScreenPick = useCallback(async () => {
    setShowMenu(false)
    try {
      const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper()
      const { sRGBHex } = await eyeDropper.open()
      await addColorToHistory(sRGBHex, 1.0)
      await addColor(sRGBHex, 1.0, activeFolderId)
    } catch {
      // ユーザーキャンセルは無視
    }
  }, [addColor, addColorToHistory, activeFolderId])

  const handleOpenAddModal = useCallback(() => setShowAddModal(true), [])

  useKeyboardShortcuts({
    openAddModal: handleOpenAddModal,
    openScreenPicker: handleScreenPick,
  })

  // 初回データ取得
  useEffect(() => {
    fetchFolders()
    fetchTags()
    fetchAllColorTags()
  }, [fetchFolders, fetchTags, fetchAllColorTags])

  // フォルダ・セクション変更時にデータ再取得
  useEffect(() => {
    if (activeSection === 'favorites') {
      fetchColors()
    } else {
      fetchColors(activeFolderId)
    }
  }, [activeFolderId, activeSection, fetchColors])

  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? null

  // 5段階フィルターパイプライン
  // 1. お気に入りフィルター
  const step1 = activeSection === 'favorites'
    ? colors.filter((c) => c.is_favorite)
    : colors

  // 2. 色相フィルター
  const step2 = activeHueFilter
    ? step1.filter((c) => getHueCategory(c.hex) === activeHueFilter)
    : step1

  // 3. テキスト検索（名前・HEX・メモ・特色メモ・タグ名）
  const step3 = searchQuery.trim()
    ? (() => {
        const q = searchQuery.trim().toLowerCase()
        return step2.filter((c) => {
          if (c.name?.toLowerCase().includes(q)) return true
          if (c.hex.toLowerCase().includes(q)) return true
          if (c.memo?.toLowerCase().includes(q)) return true
          if (c.spot_color?.toLowerCase().includes(q)) return true
          const tags = colorTags[c.id] ?? []
          if (tags.some((t) => t.name.toLowerCase().includes(q))) return true
          return false
        })
      })()
    : step2

  // 4. タグフィルター
  const step4 = activeTagId
    ? step3.filter((c) => (colorTags[c.id] ?? []).some((t) => t.id === activeTagId))
    : step3

  // 5. ソート
  const displayColors = sortBy === 'used_count'
    ? [...step4].sort((a, b) => (b.used_count ?? 0) - (a.used_count ?? 0))
    : step4

  const sectionTitle =
    activeSection === 'favorites' ? 'お気に入り' :
    activeSection === 'history' ? '最近使った色' :
    activeSection === 'generator' ? 'カラージェネレーター' :
    'すべての色'

  const isGenerator = activeSection === 'generator'

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
          {!isGenerator && (
            <>
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
            </>
          )}
          {/* エクスポート・インポートメニュー */}
          <ExportMenu
            onVisualExport={() => setShowVisualExport(true)}
            onPaletteExport={() => setShowPaletteExport(true)}
            onImport={() => setShowImport(true)}
            onExportAll={() => {
              const filename = `colorpicker-backup-${new Date().toISOString().slice(0, 10)}.json`
              downloadAllDataJSON(colors, folders, filename)
            }}
          />
        </header>

        {!isGenerator && <FilterBar />}

        <div className="flex-1 flex flex-col overflow-hidden">
          {isBulkMode && <BulkActionBar />}

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              {isGenerator ? (
                <GeneratorView />
              ) : colorsLoading ? (
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
      {showVisualExport && (
        <VisualExportModal
          folders={folders}
          allColors={colors}
          onClose={() => setShowVisualExport(false)}
        />
      )}
      {showPaletteExport && (
        <PaletteExportModal
          folders={folders}
          allColors={colors}
          onClose={() => setShowPaletteExport(false)}
        />
      )}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}

// ---- エクスポート・インポートメニュー ----

interface ExportMenuProps {
  onVisualExport: () => void
  onPaletteExport: () => void
  onImport: () => void
  onExportAll: () => void
}

function ExportMenu({ onVisualExport, onPaletteExport, onImport, onExportAll }: ExportMenuProps) {
  const [open, setOpen] = useState(false)

  const items = [
    { label: 'ビジュアル書き出し（SVG/PNG）', onClick: onVisualExport },
    { label: 'パレット書き出し（CSV/JSON/ASE）', onClick: onPaletteExport },
    { label: 'インポート', onClick: onImport },
    { label: '全データをバックアップ', onClick: onExportAll },
  ]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1.5 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded transition-colors text-sm"
        title="書き出し / インポート"
      >
        ⋯
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => { item.onClick(); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
