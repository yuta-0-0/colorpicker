import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ListView } from '@/components/views/ListView'
import { GalleryView } from '@/components/views/GalleryView'
import { GeneratorView } from '@/components/generator/GeneratorView'
import { TrashView } from '@/components/trash/TrashView'
import { Center } from '@/components/primitives'
import { ViewToggle } from '@/components/views/ViewToggle'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { AddColorModal } from '@/components/color/AddColorModal'
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
import { useDynamicFavicon } from '@/hooks/useDynamicFavicon'
import { LiquidDock } from '@/components/dock/LiquidDock'
import { ShortcutHelpModal } from '@/components/ui/ShortcutHelpModal'
import { downloadAllDataJSON } from '@/lib/exportUtils'
import { hasTraditionalColor } from '@/lib/colorUtils'
import { IconSidebarSimple } from '@/components/ui/Icons'
import { useHistoryStore } from '@/store/historyStore'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useToastStore } from '@/store/toastStore'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { isOutOfGamut } from '@/lib/printUtils'

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
  const [sidebarWidth, setSidebarWidth] = useState(152)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showVisualExport, setShowVisualExport] = useState(false)
  const [showPaletteExport, setShowPaletteExport] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleScreenPick = useCallback(async () => {
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

  const handleSidebarResize = useCallback((width: number) => {
    setIsResizing(true)
    setSidebarWidth(width)
    clearTimeout(resizeTimerRef.current)
    resizeTimerRef.current = setTimeout(() => setIsResizing(false), 80)
  }, [])

  // 全パネル共通モーショントークン
  const PANEL_TRANSITION = { duration: 0.5, ease: [0.16, 1, 0.3, 1] } as const

  // 選択色が変わったら Prism Tile へプッシュ（Electron のみ）
  useEffect(() => {
    if (!selectedColorId) return
    const electronAPI = (window as Window & { electronAPI?: { pushColorToPrismTile?: (d: unknown) => void } }).electronAPI
    if (!electronAPI?.pushColorToPrismTile) return

    const color = colors.find((c) => c.id === selectedColorId)
    if (!color) return

    electronAPI.pushColorToPrismTile({
      hex: color.hex,
      alpha: color.alpha,
      name: color.name,
      hasGamutWarning: isOutOfGamut(color.hex),
    })
  }, [selectedColorId, colors])

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
    const electronAPI = (window as Window & { electronAPI?: { setTheme?: (t: 'dark' | 'light' | 'system') => void } }).electronAPI

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
      // Electron: system に委ねる
      electronAPI?.setTheme?.('system')

      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      root.setAttribute('data-theme', theme)
      // Electron: nativeTheme を React の選択に合わせる
      electronAPI?.setTheme?.(theme)
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

  // 閉じアニメーション中もコンテンツを保持するための ref（null になっても最後の色を表示し続ける）
  const lastColorRef = useRef(selectedColor)
  if (selectedColor) lastColorRef.current = selectedColor
  const colorForPanel = selectedColor ?? lastColorRef.current

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

    // 無彩色（彩度 12% 未満）→ 末尾: 白(700) / グレー(800) / 黒(900)
    // 昇順: 赤…ピンク → 白 → グレー → 黒
    if (s < 0.12) {
      if (l >= 0.85) return 700  // 白
      if (l <= 0.20) return 900  // 黒
      return 800                 // グレー
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
    // ギャラリービューのデフォルトは色相順（追加順のドラッグ並び替えはギャラリーでは意味がないため）
    if (viewMode === 'gallery' && sortBy === 'order') {
      return [...step6].sort((a, b) => getHue(a.hex) - getHue(b.hex))
    }
    // 追加順
    if (sortDirection === 'desc') {
      return [...step6].reverse()
    }
    return step6
  })()

  useKeyboardShortcuts({
    openAddModal: handleOpenAddModal,
    openScreenPicker: handleScreenPick,
    displayColors,
  })

  // ? キーでショートカットヘルプ
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        setShowShortcutHelp((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useDynamicFavicon(selectedColor?.hex ?? null)

  const sectionTitle =
    activeSection === 'favorites' ? 'お気に入り' :
    activeSection === 'history' ? '最近使った色' :
    activeSection === 'generator' ? 'カラージェネレーター' :
    activeSection === 'trash' ? 'ゴミ箱' :
    'すべての色'

  const isGenerator = activeSection === 'generator'
  const isTrash = activeSection === 'trash'

  const isElectron = !!(window as Window & { electronAPI?: unknown }).electronAPI

  return (
    <div className="relative h-screen overflow-hidden text-text-primary">
      {/* ── 全幅ドラッグバー：absolute で最前面に配置（Electron のみ） ── */}
      {isElectron && (
        <div
          className="app-drag absolute top-0 left-0 right-0 z-10 flex items-center"
          style={{ height: 40, paddingLeft: 80, paddingRight: 8, gap: 8 }}
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
            className="no-drag p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/8 transition-colors"
          >
            <IconSidebarSimple size={14} />
          </button>
        </div>
      )}

      {/* ── Bentos 行（ドラッグバー分だけ上に余白） ── */}
      <div
        className="flex h-full overflow-hidden"
        style={{
          gap: '10px',
          padding: '10px',
          paddingTop: isElectron ? '46px' : '10px',
        }}
      >
      {/* モバイル用オーバーレイ */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar Bento Pane ── */}
      {/* 外側マスク: width 0→実幅 でクリップ。padding/border/margin なし */}
      <motion.div
        className="flex-shrink-0 overflow-hidden rounded-[2rem]"
        animate={{
          width: sidebarCollapsed ? 0 : sidebarWidth,
          opacity: sidebarCollapsed ? 0 : 1,
          marginRight: sidebarCollapsed ? -10 : 0,
        }}
        transition={isResizing ? { duration: 0 } : PANEL_TRANSITION}
        style={{ willChange: 'width, opacity' }}
      >
        {/* 内側コンテンツ: 固定幅。styling はここに集約 */}
        <aside
          className="bento-pane flex-shrink-0 flex flex-col pb-safe overflow-hidden h-full"
          style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        >
          <Sidebar
            onAddColor={handleOpenAddModal}
            onImagePick={() => setShowImageModal(true)}
            onScreenPick={handleScreenPick}
            onVisualExport={() => setShowVisualExport(true)}
            onPaletteExport={() => setShowPaletteExport(true)}
            onImport={() => setShowImport(true)}
            onExportAll={() => {
              const filename = `colorpicker-backup-${new Date().toISOString().slice(0, 10)}.json`
              downloadAllDataJSON(colors, folders, filename)
            }}
            onShortcutHelp={() => setShowShortcutHelp(true)}
            theme={theme}
            onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            width={sidebarWidth}
            onResize={handleSidebarResize}
          />
        </aside>
      </motion.div>

      {/* ── Main Bento Pane（Policy A: Strict Neutrality — 無彩色で色を正確に評価） ── */}
      <div className="bento-pane-neutral flex-1 flex flex-col min-w-0">
        {/* ヘッダー */}
        <header
          className="flex items-center gap-2 flex-shrink-0"
          style={{
            paddingLeft: '12px',
            paddingRight: '12px',
            paddingTop: '10px',
            paddingBottom: '10px',
          }}
        >
          {/* Web のみ：サイドバートグル（Electron は全幅ドラッグバーに配置済み） */}
          {!isElectron && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              title={sidebarCollapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
              className="flex-shrink-0 p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/8 transition-colors"
            >
              <IconSidebarSimple size={15} />
            </button>
          )}
          <h1 className="text-sm font-medium text-text-primary flex-1 select-none">{sectionTitle}</h1>
          {!isGenerator && !isTrash && (
            <ViewToggle mode={viewMode} onChange={setViewMode} />
          )}
          {/* Prism Tile 起動ボタン（Electron Macのみ） */}
          {(window as Window & { electronAPI?: { platform?: string; openPrismTile?: () => void } }).electronAPI?.platform === 'darwin' && (
            <button
              type="button"
              onClick={() => (window as Window & { electronAPI?: { openPrismTile?: () => void } }).electronAPI?.openPrismTile?.()}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors"
              title="Prism Tile を開く (⌘+Shift+T)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="12" height="8" rx="2"/>
                <path d="M5 5V4a3 3 0 0 1 6 0v1"/>
              </svg>
            </button>
          )}
        </header>

        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col overflow-hidden">
            {isGenerator ? (
              <GeneratorView />
            ) : isTrash ? (
              <TrashView />
            ) : colorsLoading ? (
              <Center full>
                <p className="text-text-muted text-sm">読み込み中...</p>
              </Center>
            ) : viewMode === 'list' ? (
              <ListView colors={displayColors} />
            ) : (
              <GalleryView colors={displayColors} />
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Bento Pane（独立コンテナ）── */}
      {/* 常時マウント: アンマウント時の gap 消失ジャンプを防ぐ */}
      {/* 外側マスク: width 0↔264 でクリップ。padding/border/margin なし */}
      <motion.div
        className="flex-shrink-0 overflow-hidden rounded-[2rem]"
        initial={{ width: 0, opacity: 0, marginLeft: -10 }}
        animate={{
          width: isDetailPanelOpen && !!colorForPanel ? 264 : 0,
          opacity: isDetailPanelOpen && !!colorForPanel ? 1 : 0,
          marginLeft: isDetailPanelOpen && !!colorForPanel ? 0 : -10,
        }}
        transition={PANEL_TRANSITION}
        style={{ willChange: 'width, opacity' }}
      >
        {/* 内側コンテンツ: 固定幅。styling はここに集約 */}
        <div
          className="bento-pane flex flex-col h-full"
          style={{ width: 264, minWidth: 264 }}
        >
          {colorForPanel && <DetailPanel color={colorForPanel} />}
        </div>
      </motion.div>

      </div> {/* ── Bentos 行 ── */}

      {/* ── 複数選択 FAB ── */}
      <AnimatePresence>
        {isBulkMode && <BulkActionBar />}
      </AnimatePresence>

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
      <ShortcutHelpModal open={showShortcutHelp} onClose={() => setShowShortcutHelp(false)} />
      <ToastContainer />
      <LiquidDock />
    </div>
  )
}

