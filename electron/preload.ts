import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // テーマ同期（React → Electron nativeTheme）
  setTheme: (themeSource: 'dark' | 'light' | 'system') => ipcRenderer.invoke('theme:set', themeSource),

  // スクリーンピッカー
  startScreenPicker: () => ipcRenderer.invoke('screen-picker:start'),

  // プラットフォーム情報
  platform: process.platform,

  // Prism Tile 操作（メインウィンドウ側から呼ぶ）
  openPrismTile:  () => ipcRenderer.invoke('prism-tile:open'),
  closePrismTile: () => ipcRenderer.invoke('prism-tile:close'),

  // Prism Tile に色をプッシュ
  pushColorToPrismTile: (colorData: { hex: string; alpha: number; name: string; hasGamutWarning: boolean }) => {
    ipcRenderer.send('prism-tile:push-color', colorData)
  },

  // Prism Tile 側で最新色を受信
  onPrismTileColorUpdated: (callback: (colorData: { hex: string; alpha: number; name: string; hasGamutWarning: boolean }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: unknown) =>
      callback(data as { hex: string; alpha: number; name: string; hasGamutWarning: boolean })
    ipcRenderer.on('prism-tile:color-updated', handler)
    return () => ipcRenderer.removeListener('prism-tile:color-updated', handler)
  },

  // ── Floating System ────────────────────────────────────────
  openFloatingSystem:   () => ipcRenderer.invoke('fs:open'),
  closeFloatingSystem:  () => ipcRenderer.invoke('fs:close'),
  requestFloatingResize: (size: { width: number; height: number; anchor?: 'center' | 'left' | 'right' }) =>
    ipcRenderer.invoke('fs:request-resize', size),
  pushSyncToFloating: (payload: unknown) =>
    ipcRenderer.send('fs:push-sync', payload),

  // Floating 側: 受信
  onFloatingSync: (cb: (payload: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: unknown) => cb(data)
    ipcRenderer.on('fs:sync', handler)
    return () => ipcRenderer.removeListener('fs:sync', handler)
  },
  onFloatingSnapChange: (cb: (data: { side: 'none' | 'left' | 'right' }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: unknown) =>
      cb(data as { side: 'none' | 'left' | 'right' })
    ipcRenderer.on('fs:snap-change', handler)
    return () => ipcRenderer.removeListener('fs:snap-change', handler)
  },
  floatingColorSelected: (hex: string) =>
    ipcRenderer.send('fs:color-selected', { hex }),
  onFloatingColorSelected: (cb: (data: { hex: string }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: unknown) => cb(data as { hex: string })
    ipcRenderer.on('fs:color-selected', handler)
    return () => ipcRenderer.removeListener('fs:color-selected', handler)
  },

  // Step 4: メタデータ付き保存（Floating → main window）
  // memo・tag を追加（State C ののれん入力欄から送信）
  floatingSaveColor: (data: { hex: string; alpha: number; name?: string; memo?: string; tag?: string }) =>
    ipcRenderer.send('fs:save-color', data),
  onFloatingSaveColor: (cb: (data: { hex: string; alpha: number; name?: string; memo?: string; tag?: string }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: unknown) =>
      cb(data as { hex: string; alpha: number; name?: string; memo?: string; tag?: string })
    ipcRenderer.on('fs:save-color', handler)
    return () => ipcRenderer.removeListener('fs:save-color', handler)
  },

  // ── スクリーンピッカー IPC 回路 ────────────────────────────────
  // Step 6 修正: main window は onScreenPickerStart を使わなくなった
  // （executeJavaScript(userGesture=true) で直接起動するため）
  // 既存コードとの互換性のため定義は残す
  onScreenPickerStart: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('screen-picker:start', handler)
    return () => ipcRenderer.removeListener('screen-picker:start', handler)
  },
  // floating window: ピッカー結果を受信
  onFloatingColorFromPicker: (cb: (data: { hex: string }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: unknown) => cb(data as { hex: string })
    ipcRenderer.on('fs:color-from-picker', handler)
    return () => ipcRenderer.removeListener('fs:color-from-picker', handler)
  },
  // main window: ピッカーで取得した色を main process へ報告（空文字=キャンセル）
  reportPickedColor: (hex: string) => {
    ipcRenderer.send('screen-picker:picked', { hex })
  },

  // ── Docking System ────────────────────────────────────────
  // FloatingTab / ProxyTab ドットクリック → Implosion トリガー
  triggerImplosionFromDock: () => ipcRenderer.send('fs:trigger-implosion'),
  // AppLayout がサイドバー幅変化を main に通知
  updateDockOffset: (offsetX: number, offsetY: number) =>
    ipcRenderer.send('main:update-dock-offset', { offsetX, offsetY }),

  // ── ProxyTab A→B 回路 ──────────────────────────────────────
  // ProxyTab outer double-click → floatingWin show + Blooming 自動起動
  // （main は hide せず、floatingWin だけ ProxyTab 座標に出現）
  proxyOpenToolbar: () => ipcRenderer.send('proxy:open-toolbar'),

  // FloatingSystemView: main.ts からの Blooming 開始合図を受信
  onFloatingAutoOpenToolbar: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('fs:auto-open-toolbar', handler)
    return () => ipcRenderer.removeListener('fs:auto-open-toolbar', handler)
  },

  // FloatingSystemView: main:implosion-start からの State A 強制リセット合図
  onFloatingResetToTab: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('fs:reset-to-tab', handler)
    return () => ipcRenderer.removeListener('fs:reset-to-tab', handler)
  },

  // ── Implosion / Explosion ─────────────────────────────────
  // AppLayout: main:trigger-hide を受信してアニメ開始
  onMainTriggerHide: (cb: (coords: { relX: number; relY: number }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: unknown) =>
      cb(data as { relX: number; relY: number })
    ipcRenderer.on('main:trigger-hide', handler)
    return () => ipcRenderer.removeListener('main:trigger-hide', handler)
  },
  // AppLayout: Implosion アニメ開始直後に呼ぶ → floatingWin を先行配置（show なし）+ トラフィックライト非表示
  mainImplosionStart: () => ipcRenderer.send('main:implosion-start'),
  // AppLayout: Explosion アニメ完了後に呼ぶ → トラフィックライト復元
  mainTrafficLightsShow: () => ipcRenderer.send('main:traffic-lights-show'),
  // AppLayout: Implosion アニメ完了後に呼ぶ → main.ts が hide()
  mainHideReady: () => ipcRenderer.send('main:hide-ready'),

  // AppLayout: main:will-show を受信して Explosion アニメ開始
  onMainWillShow: (cb: (data: { relX: number; relY: number; animate: boolean }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: unknown) =>
      cb(data as { relX: number; relY: number; animate: boolean })
    ipcRenderer.on('main:will-show', handler)
    return () => ipcRenderer.removeListener('main:will-show', handler)
  },
  // AppLayout: Explosion Phase 1 開始直前に main に通知 → setOpacity(1) のタイミング同期
  notifyExplosionStart: () => ipcRenderer.send('main:explosion-start'),

  // FloatingTab: HeroDot ダブルクリック後に Main 復元を要求（B→A→Main フロー）
  requestMainShowFromFloating: () => ipcRenderer.send('main:show-from-floating'),

  // FloatingToolbar: B→Main 直結（ガラスカプセル出現前に Main を起動）
  requestMainShowFromBDirect: () => ipcRenderer.send('main:show-from-b-direct'),
})
