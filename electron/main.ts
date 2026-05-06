import { app, BrowserWindow, globalShortcut, ipcMain, nativeTheme, screen } from 'electron'
import path from 'path'

const isDev = !app.isPackaged

// Prism Tile ウィンドウの参照
let prismTileWin: BrowserWindow | null = null

// メインウィンドウの参照（IPC ハンドラから直接アクセスするためモジュール変数）
let mainWin: BrowserWindow | null = null

// Floating System ウィンドウの参照
let floatingWin: BrowserWindow | null = null

// ── ProxyDocking System ─────────────────────────────────────────────
// メインウィンドウが表示されている間は floatingWin を hide() し、
// メインウィンドウ内の FloatingProxy（React）がビジュアルを担当する。
// メインウィンドウが hide() したとき＝Implosion 完了後に、
// ProxyTab と同座標に floatingWin を show() して「本物が現れた」ように見せる。
let dockOffsetX = 172  // ProxyTab left: 10(pad) + 152(sidebar) + 10(gap)
let dockOffsetY = 7    // ProxyTab top: 光学中心 = (46-32)/2 = 7px（Bento境界まで上下均等）

// Explosion アニメーション中は win.on('show') での floatingWin.hide() をスキップ
// → Tab A が Explosion の「窓」として main の展開を見届ける
let explosionAnimating = false
// ProxyTab outer double-click 後、hide-ready で Blooming を自動起動するフラグ
let pendingAutoToolbar = false

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
    // メインウィンドウが表示中（floatingWin が hide 状態）はスナップ判定スキップ
    if (mainWin && !mainWin.isDestroyed() && mainWin.isVisible()) return
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
  mainWin = createWindow()
  const win = mainWin

  // ── ProxyDocking: FloatingSystem は起動直後に hide() して待機 ────────
  // メインウィンドウが visible な間は FloatingProxy（React 内）が代役を務める。
  // main hide → floatingWin が ProxyTab 座標に show() → 本物が現れる演出。
  const fWin = createFloatingSystemWindow()
  const ib = win.getBounds()
  fWin.setPosition(ib.x + dockOffsetX, ib.y + dockOffsetY)
  fWin.hide()  // メインが表示中は常に非表示

  // メインウィンドウが再び表示される → floatingWin を隠す
  // ただし Explosion アニメーション中（explosionAnimating=true）は即時 hide しない。
  // floatingWin（Tab A）が Explosion の前景として残り、完了後に ProxyTab へ引き継ぐ。
  win.on('show', () => {
    if (!explosionAnimating && floatingWin && !floatingWin.isDestroyed()) floatingWin.hide()
  })

  // メインウィンドウが隠れる（Implosion 完了）→ floatingWin を ProxyTab 座標に出現
  // ※ main:hide-ready で呼ぶため、ここでは何もしない（hide-ready が制御する）

  // メインウィンドウ呼び出し（トグル: 表示中→Implosion / 非表示→即表示）
  const mainShortcutOk = globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (win.isVisible() && win.isFocused()) {
      // Implosion: ProxyTab の座標（dockOffset）を爆縮点として AppLayout に送る
      const mb = win.getBounds()
      const cx = mb.x + dockOffsetX + 17  // ProxyTab ドット中心 X
      const cy = mb.y + dockOffsetY + 16  // ProxyTab ドット中心 Y
      const relX = Math.max(0, Math.min(100, ((cx - mb.x) / mb.width)  * 100))
      const relY = Math.max(0, Math.min(100, ((cy - mb.y) / mb.height) * 100))
      // 二相最適化: アニメーション開始と同時に floatingWin を先行配置
      // main:hide-ready は hide + show のみ（座標計算なし）
      if (floatingWin && !floatingWin.isDestroyed()) {
        floatingWin.setPosition(mb.x + dockOffsetX, mb.y + dockOffsetY)
      }
      win.webContents.send('main:trigger-hide', { relX, relY })
    } else {
      // Explosion: floatingWin を先に hide してから main を show（チラツキ防止）
      if (floatingWin && !floatingWin.isDestroyed()) floatingWin.hide()
      if (win.isMinimized()) win.restore()
      // アニメなし: トラフィックライトを show 前に即時復元
      if (process.platform === 'darwin') win.setWindowButtonVisibility(true)
      win.webContents.send('main:will-show', { relX: 50, relY: 50, animate: false })
      setTimeout(() => { win.show(); win.focus() }, 16)
    }
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

  // ── Step 6: floatingWin は hide しない ──────────────────────────
  // transparent: true のウィンドウは EyeDropper の邪魔にならない。
  // スポイト実行中も「手元に機材がある安心感」を維持する。

  // main window 上で EyeDropper を userGesture=true で起動
  const mainWins = BrowserWindow.getAllWindows().filter(
    w => w !== floatingWin && w !== prismTileWin && !w.isDestroyed()
  )
  mainWins.forEach(w =>
    w.webContents.executeJavaScript(EYEDROPPER_JS, true).catch(() => {
      // executeJavaScript 失敗時は何もしない（floatingWin は show 済み）
    })
  )

  return null
})

// step 2: main window が色をピックしたら floating へ転送
// hex が空文字の場合はキャンセル扱い → 色更新なし
ipcMain.on('screen-picker:picked', (_, { hex }: { hex: string }) => {
  if (screenPickerReturnToFloating) {
    // floatingWin は hide していないので show 不要
    if (floatingWin && !floatingWin.isDestroyed() && hex) {
      floatingWin.webContents.send('fs:color-from-picker', { hex })
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
ipcMain.handle('fs:request-resize', (_, { width, height, anchor = 'left' }: { width: number; height: number; anchor?: 'center' | 'left' | 'right' | 'top' }) => {
  if (!floatingWin || floatingWin.isDestroyed()) return
  const display = screen.getPrimaryDisplay()
  const { workAreaSize: wa } = display
  const workArea = display.workArea
  const bounds = floatingWin.getBounds()

  if (anchor === 'top') {
    // 画面トップに吸着: 現在の x を維持して y=workArea.top に固定
    const newX = Math.max(workArea.x, Math.min(bounds.x, workArea.x + wa.width - width))
    floatingWin.setBounds({ x: newX, y: workArea.y, width, height })
    return
  }

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

// Step 4: Floating System: メタデータ付きで保存 → メインウィンドウへ転送
// memo / tag フィールドを追加（State C ののれん入力から送信）
ipcMain.on('fs:save-color', (_, payload: { hex: string; alpha: number; name?: string; memo?: string; tag?: string }) => {
  const wins = BrowserWindow.getAllWindows().filter(w => w !== floatingWin && !w.isDestroyed())
  wins.forEach(w => w.webContents.send('fs:save-color', payload))
})

// ── Implosion / Explosion IPC ────────────────────────────────────────

// Implosion 開始通知: AppLayout が startImplosion() 冒頭で即送信
// → floatingWin を ProxyTab 座標 (State A Tab サイズ 80×32) に先行配置・リセット
// → main:hide-ready は hide + show だけに専念（位置計算なし）
ipcMain.on('main:implosion-start', () => {
  if (!mainWin || mainWin.isDestroyed()) return
  if (!floatingWin || floatingWin.isDestroyed()) return
  const mb = mainWin.getBounds()
  // ProxyTab 座標に配置 + State A のサイズ(80×32)に強制リセット
  // 前回 State B(Toolbar)のままだと show() 時に縦長で出てしまうのを防ぐ
  floatingWin.setBounds({
    x: mb.x + dockOffsetX,
    y: mb.y + dockOffsetY,
    width: 80,
    height: 32,
  })
  // React 状態も State A(Tab)にリセット
  floatingWin.webContents.send('fs:reset-to-tab')
  // clip-path 収束アニメーションと同時にトラフィックライトを非表示
  if (process.platform === 'darwin') mainWin.setWindowButtonVisibility(false)
})

// B→Main: renderer の RAF×2 完了 → Phase 1 start() 直前に送信される
// setOpacity(0) で show した mainWin を、コンポジターが新フレームをコミット済みのタイミングで出現させる
ipcMain.on('main:explosion-start', () => {
  if (!mainWin || mainWin.isDestroyed()) return
  mainWin.setOpacity(1)
})

// Explosion 完了通知: onAnimationComplete → mainTrafficLightsShow() で送信
// clip-path が circle(150%) に達したタイミング = トラフィックライトが視覚的に現れるべき瞬間
ipcMain.on('main:traffic-lights-show', () => {
  if (!mainWin || mainWin.isDestroyed()) return
  if (process.platform === 'darwin') mainWin.setWindowButtonVisibility(true)
})

// Implosion 完了通知: onAnimationComplete → mainHideReady() で送信
// floatingWin は main:implosion-start で既に位置決め済みなので hide + show のみ
ipcMain.on('main:hide-ready', () => {
  if (!mainWin || mainWin.isDestroyed()) return
  mainWin.hide()
  if (floatingWin && !floatingWin.isDestroyed()) {
    floatingWin.show()
    floatingWin.focus()
    if (pendingAutoToolbar) {
      pendingAutoToolbar = false
      floatingWin.webContents.send('fs:auto-open-toolbar')
    }
  }
})

// ── Docking System IPC ──────────────────────────────────────────────

// AppLayout がサイドバー幅の変化を通知 → dockOffset を更新（ハンドオフ座標に使用）
ipcMain.on('main:update-dock-offset', (_, { offsetX, offsetY }: { offsetX: number; offsetY: number }) => {
  dockOffsetX = offsetX
  dockOffsetY = offsetY
})

// ProxyTab のドットダブルクリック → Implosion
// アニメーションはレンダラー側が relX/relY を即計算して先行開始済み。
// main.ts は main:hide-ready を待ってウィンドウ切り替えだけ担当する。
ipcMain.on('fs:trigger-implosion', () => {
  // no-op: ウィンドウ管理は main:hide-ready ハンドラーで行う
})

// ── ProxyTab outer double-click → Implosion → A→B Blooming ─────────────
// 【重要】main を hide させてから floatingWin を出す（ProxyTab との dual-visibility を防ぐ）
// fs:trigger-implosion（ドットクリック）と同じ Implosion フローを踏む。
// pendingAutoToolbar フラグで hide-ready 後に fs:auto-open-toolbar を追加送信する。
//
// フロー:
//   1. ProxyTab dot 中心座標で main:trigger-hide（Implosion アニメーション開始）
//   2. AppLayout が 0.6s 収束アニメーション → mainHideReady()
//   3. main:hide-ready: mainWin.hide() → floatingWin.show() → fs:auto-open-toolbar
//   4. FloatingSystemView: resize → wait 60ms → setFloatingState('toolbar') → Blooming
ipcMain.on('proxy:open-toolbar', () => {
  if (!mainWin || mainWin.isDestroyed()) return
  // アニメーションはレンダラー側が先行開始済み。フラグだけ立てて main:hide-ready を待つ。
  pendingAutoToolbar = true
})

// Explosion トリガー: FloatingTab(State A) HeroDot ダブルクリック → Main を爆発展開
//
// ── フロー（Tab A が Explosion の「窓」になる + 位置ズレ根治）──────────
//   1. floatingWin の現在位置に合わせて mainWin を移動
//      → ProxyTab screen 座標 = floatingWin screen 座標（完全一致）
//   2. floatingWin（Tab A）は消さない → alwaysOnTop で前景に残る
//   3. main:will-show（relX/relY = ProxyTab dot の mainWin 内相対位置）
//   4. mainWin.show() → win.on('show') は explosionAnimating=true でスキップ
//   5. Explosion（0.6s）: Tab A が静止したまま main が後ろで展開
//   6. +700ms: floatingWin を hide（ProxyTab が同座標を引き継ぐ = 位置ズレなし）
// B→Main 直結: FloatingToolbar HeroDot ダブルクリック → 1100ms タイマー後に呼ばれる
// ガラスカプセル出現（BA_ENTER_DELAY=1184ms）より前に floatingWin を即 hide して
// mainWin のクリップアニメーション（カプセル→ヘッダー→フル）に切り替える
ipcMain.on('main:show-from-b-direct', () => {
  if (!mainWin || mainWin.isDestroyed()) return
  const fb = floatingWin?.isDestroyed() ? null : floatingWin?.getBounds()
  const mb = mainWin.getBounds()
  const { workAreaSize: wa } = screen.getPrimaryDisplay()

  if (fb) {
    const newMX = Math.max(0, Math.min(fb.x - dockOffsetX, wa.width  - mb.width))
    const newMY = Math.max(0, Math.min(fb.y - dockOffsetY, wa.height - mb.height))
    mainWin.setPosition(newMX, newMY)
  }

  // floatingWin を即 hide（ガラスカプセルが画面に出現しないようにする）
  if (floatingWin && !floatingWin.isDestroyed()) floatingWin.hide()

  const relX = Math.max(0, Math.min(100, ((dockOffsetX + 17) / mb.width)  * 100))
  const relY = Math.max(0, Math.min(100, ((dockOffsetY + 16) / mb.height) * 100))

  // opacity=0 で show → backgroundThrottling=true でも RAF が動きコンポジターが新フレームをコミットできる
  // renderer は RAF×2 後に Phase 1 start() + main:explosion-start を送信 → setOpacity(1) でウィンドウ出現
  // これにより「古いコンポジターフレームが一瞬見える = ドットの揺れ」を完全に防ぐ
  mainWin.setOpacity(0)
  explosionAnimating = true
  mainWin.webContents.send('main:will-show', { relX, relY, animate: true })
  setTimeout(() => {
    mainWin!.show()   // 透明で表示 → renderer の RAF が動く
    mainWin!.focus()
    // フォールバック: IPC が届かなかった場合でも 800ms 後に opacity を戻す
    setTimeout(() => { mainWin?.setOpacity(1); explosionAnimating = false }, 800)
  }, 16)
})

ipcMain.on('main:show-from-floating', () => {
  if (!mainWin || mainWin.isDestroyed()) return
  const fb = floatingWin?.isDestroyed() ? null : floatingWin?.getBounds()
  const mb = mainWin.getBounds()
  const { workAreaSize: wa } = screen.getPrimaryDisplay()

  if (fb) {
    // mainWin を「ProxyTab が Tab A と完全に重なる位置」に移動（hide 中なので画面外から不可視）
    //   ProxyTab screen x = mainWin.x + dockOffsetX → mainWin.x = fb.x - dockOffsetX
    //   ProxyTab screen y = mainWin.y + dockOffsetY → mainWin.y = fb.y - dockOffsetY
    const newMX = Math.max(0, Math.min(fb.x - dockOffsetX, wa.width  - mb.width))
    const newMY = Math.max(0, Math.min(fb.y - dockOffsetY, wa.height - mb.height))
    mainWin.setPosition(newMX, newMY)
  }

  // ProxyTab ドット中心の mainWin 内相対位置（mainWin を移動後も dockOffset は固定）
  const relX = Math.max(0, Math.min(100, ((dockOffsetX + 17) / mb.width)  * 100))
  const relY = Math.max(0, Math.min(100, ((dockOffsetY + 16) / mb.height) * 100))

  explosionAnimating = true
  mainWin.webContents.send('main:will-show', { relX, relY, animate: true })
  // レンダラーが main:will-show を受け取ってヘッダーをドット位置にセットする猶予
  // これより前に show() するとヘッダー全幅が一瞬見えてしまう
  setTimeout(() => {
    mainWin!.show()
    mainWin!.focus()
    // Stretching Handoff 完了後（Phase1: 350ms + Phase2: 650ms, margin: 50ms）: floatingWin を hide
    // ProxyTab dot が同座標を引き継ぐためテレポートは不要
    setTimeout(() => {
      explosionAnimating = false
      if (floatingWin && !floatingWin.isDestroyed()) floatingWin.hide()
    }, 700)
  }, 50)
})
