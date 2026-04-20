import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // テーマ同期（React → Electron nativeTheme）
  setTheme: (themeSource: 'dark' | 'light' | 'system') => ipcRenderer.invoke('theme:set', themeSource),

  // スクリーンピッカー
  startScreenPicker: () => ipcRenderer.invoke('screen-picker:start'),

  // プラットフォーム情報
  platform: process.platform,

  // Prism Tile 操作（メインウィンドウ側から呼ぶ）
  openPrismTile: () => ipcRenderer.invoke('prism-tile:open'),
  closePrismTile: () => ipcRenderer.invoke('prism-tile:close'),

  // Prism Tile に色をプッシュ（メインウィンドウ → Prism Tile）
  pushColorToPrismTile: (colorData: { hex: string; alpha: number; name: string; hasGamutWarning: boolean }) => {
    ipcRenderer.send('prism-tile:push-color', colorData)
  },

  // Prism Tile 側で最新色の受信を購読
  onPrismTileColorUpdated: (callback: (colorData: { hex: string; alpha: number; name: string; hasGamutWarning: boolean }) => void) => {
    ipcRenderer.on('prism-tile:color-updated', (_, data) => callback(data))
    // クリーンアップ関数を返す
    return () => ipcRenderer.removeAllListeners('prism-tile:color-updated')
  },

  // Floating System
  openFloatingSystem: () => ipcRenderer.invoke('fs:open'),
  closeFloatingSystem: () => ipcRenderer.invoke('fs:close'),
  requestFloatingResize: (size: { width: number; height: number }) =>
    ipcRenderer.invoke('fs:request-resize', size),
  pushSyncToFloating: (payload: unknown) =>
    ipcRenderer.send('fs:push-sync', payload),

  // Floating 側: 受信
  onFloatingSync: (cb: (payload: unknown) => void) => {
    ipcRenderer.on('fs:sync', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('fs:sync')
  },
  onFloatingSnapChange: (cb: (data: { side: 'none' | 'left' | 'right' }) => void) => {
    ipcRenderer.on('fs:snap-change', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('fs:snap-change')
  },
  floatingColorSelected: (hex: string) =>
    ipcRenderer.send('fs:color-selected', { hex }),
  onFloatingColorSelected: (cb: (data: { hex: string }) => void) => {
    ipcRenderer.on('fs:color-selected', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('fs:color-selected')
  },
})
