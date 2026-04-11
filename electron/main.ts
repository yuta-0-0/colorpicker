import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import path from 'path'

const isDev = process.env.NODE_ENV === 'development'

// Prism Tile ウィンドウの参照
let prismTileWin: BrowserWindow | null = null

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hiddenInset',
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

app.whenReady().then(() => {
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})

// スクリーンピッカー
ipcMain.handle('screen-picker:start', async () => {
  return null
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
