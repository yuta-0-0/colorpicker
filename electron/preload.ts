import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
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
})
