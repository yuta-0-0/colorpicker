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

      // Step 4: メタデータ付き保存（name / memo / tag 対応）
      floatingSaveColor: (data: { hex: string; alpha: number; name?: string; memo?: string; tag?: string }) => void
      onFloatingSaveColor: (cb: (data: { hex: string; alpha: number; name?: string; memo?: string; tag?: string }) => void) => () => void

      // ── スクリーンピッカー ────────────────────────────────────
      /** Step 6: main window 側（現在は executeJavaScript で直接起動するため通常は呼ばれない） */
      onScreenPickerStart: (cb: () => void) => () => void
      onFloatingColorFromPicker: (cb: (data: { hex: string }) => void) => () => void
      reportPickedColor: (hex: string) => void

      // ── Docking System ────────────────────────────────────
      triggerImplosionFromDock?: () => void
      updateDockOffset?: (offsetX: number, offsetY: number) => void

      // ── ProxyTab A→B 回路 ────────────────────────────────
      /** ProxyTab outer double-click → floatingWin show + Blooming */
      proxyOpenToolbar?: () => void
      /** FloatingSystemView: Blooming 自動起動合図を受信 */
      onFloatingAutoOpenToolbar?: (cb: () => void) => () => void

      // ── Implosion / Explosion ─────────────────────────────
      onMainTriggerHide: (cb: (coords: { relX: number; relY: number }) => void) => () => void
      mainHideReady: () => void
      onMainWillShow: (cb: (data: { relX: number; relY: number; animate: boolean }) => void) => () => void
      requestMainShowFromFloating: () => void

    }
  }
}

export {}
