import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ListView } from '@/components/views/ListView'
import { GalleryView } from '@/components/views/GalleryView'
import { GeneratorView } from '@/components/generator/GeneratorView'
import { UITestView } from '@/components/uitest/UITestView'
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
import { useUIStore, type ToneCategory } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useFolderStore } from '@/store/folderStore'
import { useTagStore } from '@/store/tagStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { downloadAllDataJSON } from '@/lib/exportUtils'
import { hasTraditionalColor } from '@/lib/colorUtils'
import { IconMenu, IconDotsHorizontal } from '@/components/ui/Icons'
import { useHistoryStore } from '@/store/historyStore'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useToastStore } from '@/store/toastStore'
import { ToastContainer } from '@/components/ui/ToastContainer'

// 色相カテゴリを返す（FilterBar の HUE_FILTERS ラベルと一致させる）
// 10分類：赤/橙/黄/緑/青/紫/ピンク/白/グレー/黒
function getHueCategory(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const s = max === 0 ? 0 : (max - min) / max

  // 無彩色の分類（白/グレー/黒）
  if (s < 0.12) {
    if (l >= 0.85) return '白'
    if (l <= 0.20) return '黒'
    return 'グレー'
  }

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
    bulkSelectedIds,
    searchQuery,
    activeTagId,
    sortBy,
    sortDirection,
    activeTraditionalFilter,
    activeToneFilter,
    theme,
    setTheme,
  } = useUIStore()

  const { colors, loading: colorsLoading, fetchColors, addColor } = useColorStore()
  const { fetchFolders, folders } = useFolderStore()
  const { fetchTags, fetchAllColorTags, colorTags } = useTagStore()
  const { addToHistory: addColorToHistory } = useHistoryStore()
  const isOnline = useNetworkStatus()
  const { addToast } = useToastStore()
  const prevIsOnline = useRef(true)
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

  // ネットワーク状態監視
  useEffect(() => {
    if (prevIsOnline.current && !isOnline) {
      addToast('オフラインです。復帰時に自動で同期されます。', 'error')
    } else if (!prevIsOnline.current && isOnline) {
      addToast('オンラインに復帰しました。', 'success')
    }
    prevIsOnline.current = isOnline
  }, [isOnline, addToast])

  // テーマ適用
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme])

  // 初回データ取得
  useEffect(() => {
    fetchFolders()
    fetchTags()
    fetchAllColorTags()
  }, [fetchFolders, fetchTags, fetchAllColorTags])

  // フォルダ・セクション変更時にデータ再取得
  useEffect(() => {
    const load = activeSection === 'favorites' ? fetchColors() : fetchColors(activeFolderId)
    load.then(() => {
      if (useColorStore.getState().colors.length === 0) {
        useColorStore.getState().seedDefaultColors()
      }
    })
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

  // 5. 伝統色フィルター
  const step5 = activeTraditionalFilter
    ? step4.filter((c) => hasTraditionalColor(c.hex))
    : step4

  // 6. ソート（昇降対応）
  function getHue(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const l = (max + min) / 2
    const d = max - min
    // getHueCategory() と同じ HSV 彩度式・同じ閾値で無彩色判定を統一
    const s = max === 0 ? 0 : d / max

    // 無彩色（彩度 12% 未満）→ 末尾: グレー(700) / 白(800) / 黒(900)
    if (s < 0.12) {
      if (l >= 0.85) return 800  // 白
      if (l <= 0.20) return 900  // 黒
      return 700                 // グレー
    }

    // 有彩色: HSL 色相を計算
    let h = 0
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = Math.round(h * 60 + (h < 0 ? 360 : 0))

    // 赤の折り返し正規化: hue 340-360 を -20〜0 にマップして赤グループを先頭に統一
    return h >= 340 ? h - 360 : h
  }

  function getTone(hex: string): ToneCategory {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const l = (max + min) / 2
    const d = max - min
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
    if (s < 0.15) return 'neutral'
    if (l < 0.25) return 'dark'
    if (s >= 0.65 && l >= 0.35 && l <= 0.70) return 'vivid'
    if (l >= 0.70 && s < 0.55) return 'pastel'
    if (l >= 0.55) return 'light'
    return 'neutral'
  }

  // 6. トーンフィルター
  const step6 = activeToneFilter
    ? step5.filter((c) => getTone(c.hex) === activeToneFilter)
    : step5

  const dir = sortDirection === 'asc' ? 1 : -1
  const displayColors = (() => {
    if (sortBy === 'used_count') {
      return [...step6].sort((a, b) => dir * ((a.used_count ?? 0) - (b.used_count ?? 0)))
    }
    if (sortBy === 'hue') {
      return [...step6].sort((a, b) => dir * (getHue(a.hex) - getHue(b.hex)))
    }
    // 追加順
    if (sortDirection === 'desc') {
      return [...step6].reverse()
    }
    return step6
  })()

  const sectionTitle =
    activeSection === 'favorites' ? 'お気に入り' :
    activeSection === 'history' ? '最近使った色' :
    activeSection === 'generator' ? 'カラージェネレーター' :
    activeSection === 'ui-test' ? 'UIテスト' :
    'すべての色'

  const isGenerator = activeSection === 'generator'
  const isUITest = activeSection === 'ui-test'

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-text-primary">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={['fixed inset-y-0 left-0 z-30 transition-transform md:relative md:translate-x-0 pb-safe', isSidebarOpen ? 'translate-x-0' : '-translate-x-full'].join(' ')}>
        <Sidebar onVisualExport={() => setShowVisualExport(true)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} type="button" className="md:hidden text-text-secondary hover:text-text-primary"><IconMenu size={18} /></button>
          <h1 className="text-sm font-medium text-text-primary flex-1">{sectionTitle}</h1>
          {!isGenerator && !isUITest && (
            <>
              <ViewToggle mode={viewMode} onChange={setViewMode} />
              <div className="relative">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  type="button"
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-full glow-accent-btn transition-all"
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
          {/* テーマトグル */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors"
            title={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
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

        {!isGenerator && !isUITest && <FilterBar />}

        <div className="flex-1 flex flex-col overflow-hidden">
          {isBulkMode && <BulkActionBar />}

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              {isGenerator ? (
                <GeneratorView />
              ) : isUITest ? (
                <UITestView />
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
            <AnimatePresence>
              {isDetailPanelOpen && selectedColor && (
                <motion.div
                  key="detail-panel"
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 40, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <DetailPanel color={selectedColor} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {showAddModal && <AddColorModal onClose={() => setShowAddModal(false)} />}
      {showImageModal && <ImagePickerModal onClose={() => setShowImageModal(false)} />}
      {showVisualExport && (
        <VisualExportModal
          folders={folders}
          allColors={colors}
          selectedColors={colors.filter((c) => bulkSelectedIds.includes(c.id))}
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
      <ToastContainer />
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
        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded transition-colors"
        title="書き出し / インポート"
      >
        <IconDotsHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-surface/85 backdrop-blur-md border border-border/50 rounded-lg z-50 overflow-hidden">
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
