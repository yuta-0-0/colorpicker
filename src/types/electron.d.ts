/**
 * Electron preload で公開される window.electronAPI の型定義
 * ambient declaration file — import / export は不要
 */

declare global {
  interface Window {
    electronAPI?: {
      startScreenPicker: () => Promise<null>
      platform: string
      openPrismTile: () => Promise<void>
      closePrismTile: () => Promise<void>
      pushColorToPrismTile: (data: {
        hex: string
        alpha: number
        name: string
        hasGamutWarning: boolean
      }) => void
      onPrismTileColorUpdated: (cb: (data: {
        hex: string
        alpha: number
        name: string
        hasGamutWarning: boolean
      }) => void) => () => void
      // Floating System
      openFloatingSystem: () => Promise<void>
      closeFloatingSystem: () => Promise<void>
      requestFloatingResize: (size: { width: number; height: number; anchor?: 'center' | 'left' | 'right' }) => Promise<void>
      pushSyncToFloating: (payload: unknown) => void
      onFloatingSync: (cb: (payload: unknown) => void) => () => void
      onFloatingSnapChange: (cb: (data: { side: 'none' | 'left' | 'right' }) => void) => () => void
      floatingColorSelected: (hex: string) => void
      onFloatingColorSelected: (cb: (data: { hex: string }) => void) => () => void
      // スクリーンピッカー IPC 回路
      /** main window: floating からの要求で EyeDropper を起動する指示を受け取る */
      onScreenPickerStart: (cb: () => void) => () => void
      onFloatingColorFromPicker: (cb: (data: { hex: string }) => void) => () => void
      /** main window: EyeDropper 完了後に hex を main process へ報告（空文字=キャンセル） */
      reportPickedColor: (hex: string) => void
    }
  }
}

export {}
