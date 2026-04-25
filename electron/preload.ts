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
})
