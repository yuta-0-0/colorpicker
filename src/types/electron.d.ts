/**
 * Electron preload で公開される window.electronAPI の型定義
 */

declare global {
  interface Window {
    electronAPI?: {
      setTheme: (themeSource: 'dark' | 'light' | 'system') => Promise<void>
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

      // ── Floating System ──────────────────────────────────────
      openFloatingSystem: () => Promise<void>
      closeFloatingSystem: () => Promise<void>
      requestFloatingResize: (size: { width: number; height: number; anchor?: 'center' | 'left' | 'right' }) => Promise<void>
      pushSyncToFloating: (payload: unknown) => void
      onFloatingSync: (cb: (payload: unknown) => void) => () => void
      onFloatingSnapChange: (cb: (data: { side: 'none' | 'left' | 'right' }) => void) => () => void
      floatingColorSelected: (hex: string) => void
      onFloatingColorSelected: (cb: (data: { hex: string }) => void) => () => void

      // Step 4: メタデータ付き保存
      floatingSaveColor: (data: { hex: string; alpha: number; name?: string }) => void
      onFloatingSaveColor: (cb: (data: { hex: string; alpha: number; name?: string }) => void) => () => void

      // ── スクリーンピッカー ────────────────────────────────────
      /** Step 6: main window 側（現在は executeJavaScript で直接起動するため通常は呼ばれない） */
      onScreenPickerStart: (cb: () => void) => () => void
      onFloatingColorFromPicker: (cb: (data: { hex: string }) => void) => () => void
      reportPickedColor: (hex: string) => void
    }
  }
}

export {}
