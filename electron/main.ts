import { app, BrowserWindow, globalShortcut, ipcMain, nativeTheme, screen } from 'electron'
import path from 'path'

const isDev = !app.isPackaged

// Prism Tile ウィンドウの参照
let prismTileWin: BrowserWindow | null = null

// Floating System ウィンドウの参照
let floatingWin: BrowserWindow | null = null

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#00000000',
    titleBarStyle: 'hiddenInset',
    transparent: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return win
}

function createPrismTileWindow() {
  if (prismTileWin && !prismTileWin.isDestroyed()) {
    prismTileWin.show()
    prismTileWin.focus()
    return prismTileWin
  }

  // 画面右下に配置
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  const winWidth = 320
  const winHeight = 140
  const margin = 16

  prismTileWin = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: screenWidth - winWidth - margin,
    y: screenHeight - winHeight - margin,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    hasShadow: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    prismTileWin.loadURL('http://localhost:5173/?prism-tile=1')
  } else {
    prismTileWin.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { 'prism-tile': '1' },
    })
  }

  prismTileWin.on('closed', () => {
    prismTileWin = null
  })

  return prismTileWin
}

const SNAP_THRESHOLD = 40  // px: この距離以内で画面端スナップ

function createFloatingSystemWindow() {
  if (floatingWin && !floatingWin.isDestroyed()) {
    floatingWin.show()
    floatingWin.focus()
    return floatingWin
  }

  const { workAreaSize, bounds: displayBounds } = screen.getPrimaryDisplay()
  const winWidth = 80
  const winHeight = 32

  floatingWin = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: displayBounds.x + Math.floor((workAreaSize.width - winWidth) / 2),
    y: displayBounds.y + 60,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    floatingWin.loadURL('http://localhost:5173/?floating-system=1')
  } else {
    floatingWin.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { 'floating-system': '1' },
    })
  }

  // Snap 判定: ウィンドウが移動するたびに画面端との距離を検査
  let lastSnapSide: 'none' | 'left' | 'right' = 'none'
  floatingWin.on('moved', () => {
    if (!floatingWin || floatingWin.isDestroyed()) return
    const winBounds = floatingWin.getBounds()
    const { workAreaSize: wa } = screen.getPrimaryDisplay()

    let side: 'none' | 'left' | 'right' = 'none'
    if (winBounds.x <= SNAP_THRESHOLD) {
      side = 'left'
      floatingWin.setPosition(0, winBounds.y)
    } else if (winBounds.x + winBounds.width >= wa.width - SNAP_THRESHOLD) {
      side = 'right'
      floatingWin.setPosition(wa.width - winBounds.width, winBounds.y)
    }

    if (side !== lastSnapSide) {
      lastSnapSide = side
      floatingWin.webContents.send('fs:snap-change', { side })
    }
  })

  floatingWin.on('closed', () => {
    floatingWin = null
  })

  return floatingWin
}

// 2重起動防止：2つ目のインスタンスは即終了して1つ目を前面に出す
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) {
    if (wins[0].isMinimized()) wins[0].restore()
    wins[0].focus()
  }
})

app.whenReady().then(() => {
  if (!gotLock) return
  const win = createWindow()

  // メインウィンドウ呼び出し
  const mainShortcutOk = globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (win.isMinimized()) win.restore()
    win.focus()
  })
  if (!mainShortcutOk) {
    console.warn('Failed to register global shortcut ⌘+Shift+P')
  }

  // Prism Tile 呼び出し（⌘+Shift+T）
  const prismShortcutOk = globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (prismTileWin && !prismTileWin.isDestroyed() && prismTileWin.isVisible()) {
      prismTileWin.hide()
    } else {
      createPrismTileWindow()
    }
  })
  if (!prismShortcutOk) {
    console.warn('Failed to register global shortcut ⌘+Shift+T')
  }

  // Floating System 呼び出し（⌘+Shift+F）
  const floatingShortcutOk = globalShortcut.register('CommandOrControl+Shift+F', () => {
    if (floatingWin && !floatingWin.isDestroyed() && floatingWin.isVisible()) {
      floatingWin.hide()
    } else {
      createFloatingSystemWindow()
    }
  })
  if (!floatingShortcutOk) {
    console.warn('Failed to register global shortcut ⌘+Shift+F')
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})

// テーマ同期: React → Electron nativeTheme
ipcMain.handle('theme:set', (_, themeSource: 'dark' | 'light' | 'system') => {
  nativeTheme.themeSource = themeSource
})

// ── スクリーンピッカー IPC 回路 ──────────────────────────────────
// floating または main どちらから呼ばれたかを追跡
let screenPickerReturnToFloating = false

// Step 6 修正: EyeDropper は userGesture=true の executeJavaScript で起動する
// IPC リスナー経由では user activation が取れないため、main プロセスから
// executeJavaScript(code, true) を使って強制的にジェスチャーとして実行する
const EYEDROPPER_JS = `
(async () => {
  try {
    const picker = new EyeDropper();
    const { sRGBHex } = await picker.open();
    window.electronAPI.reportPickedColor(sRGBHex);
  } catch {
    // キャンセル時も reportPickedColor('') で floating を再表示させる（Step 6）
    window.electronAPI.reportPickedColor('');
  }
})();
`

// step 1: picker 起動要求（floating または main から）
ipcMain.handle('screen-picker:start', async (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender)
  screenPickerReturnToFloating = (senderWin === floatingWin)

  if (screenPickerReturnToFloating && floatingWin && !floatingWin.isDestroyed()) {
    // floating を一時非表示（スクリーンを遮らないように）
    floatingWin.hide()
  }

  // main window 上で EyeDropper を userGesture=true で起動
  const mainWins = BrowserWindow.getAllWindows().filter(
    w => w !== floatingWin && w !== prismTileWin && !w.isDestroyed()
  )
  mainWins.forEach(w =>
    w.webContents.executeJavaScript(EYEDROPPER_JS, true).catch(() => {
      // executeJavaScript 失敗時は floating を再表示
      if (floatingWin && !floatingWin.isDestroyed()) floatingWin.show()
    })
  )

  return null
})

// step 2: main window が色をピックしたら floating へ転送
// hex が空文字の場合はキャンセル扱い → floating を表示するだけで色は更新しない
ipcMain.on('screen-picker:picked', (_, { hex }: { hex: string }) => {
  if (screenPickerReturnToFloating) {
    if (floatingWin && !floatingWin.isDestroyed()) {
      floatingWin.show()
      if (hex) {
        floatingWin.webContents.send('fs:color-from-picker', { hex })
      }
    }
    screenPickerReturnToFloating = false
  }
})

// Prism Tile: メインプロセスから開く
ipcMain.handle('prism-tile:open', () => {
  createPrismTileWindow()
})

// Prism Tile: 閉じる
ipcMain.handle('prism-tile:close', () => {
  if (prismTileWin && !prismTileWin.isDestroyed()) {
    prismTileWin.hide()
  }
})

// Prism Tile: 色を更新（メインウィンドウ → Prism Tile へプッシュ）
ipcMain.on('prism-tile:push-color', (_, colorData: { hex: string; alpha: number; name: string; hasGamutWarning: boolean }) => {
  if (prismTileWin && !prismTileWin.isDestroyed()) {
    prismTileWin.webContents.send('prism-tile:color-updated', colorData)
  }
})

// Floating System: 開く
ipcMain.handle('fs:open', () => {
  createFloatingSystemWindow()
})

// Floating System: 閉じる
ipcMain.handle('fs:close', () => {
  if (floatingWin && !floatingWin.isDestroyed()) floatingWin.hide()
})

// Floating System: ウィンドウリサイズ要求（React → main）
ipcMain.handle('fs:request-resize', (_, { width, height, anchor = 'left' }: { width: number; height: number; anchor?: 'center' | 'left' | 'right' }) => {
  if (!floatingWin || floatingWin.isDestroyed()) return
  const { workAreaSize: wa } = screen.getPrimaryDisplay()
  const bounds = floatingWin.getBounds()

  let newX: number
  if (anchor === 'center') {
    // 中心X座標を維持してリサイズ（Tab ↔ Toolbar モーフ時）
    const centerX = bounds.x + Math.floor(bounds.width / 2)
    newX = centerX - Math.floor(width / 2)
  } else if (anchor === 'right') {
    // 右端固定（右スナップ時の Dock 開閉）
    newX = bounds.x + bounds.width - width
  } else {
    // 'left': 左端固定（デフォルト）
    newX = bounds.x
  }

  // 画面内にクランプ
  newX = Math.max(0, Math.min(newX, wa.width - width))
  floatingWin.setBounds({ x: newX, y: bounds.y, width, height })
})

// Floating System: 色同期（メインウィンドウ → Floating）
ipcMain.on('fs:push-sync', (_, payload: unknown) => {
  if (floatingWin && !floatingWin.isDestroyed()) {
    floatingWin.webContents.send('fs:sync', payload)
  }
})

// Floating System: Floating で色を選択 → メインウィンドウへ通知
ipcMain.on('fs:color-selected', (_, { hex }: { hex: string }) => {
  const wins = BrowserWindow.getAllWindows().filter(w => w !== floatingWin && !w.isDestroyed())
  wins.forEach(w => w.webContents.send('fs:color-selected', { hex }))
})

// Step 4: Floating System: 名前メタデータ付きで保存 → メインウィンドウへ転送
ipcMain.on('fs:save-color', (_, payload: { hex: string; alpha: number; name?: string }) => {
  const wins = BrowserWindow.getAllWindows().filter(w => w !== floatingWin && !w.isDestroyed())
  wins.forEach(w => w.webContents.send('fs:save-color', payload))
})
