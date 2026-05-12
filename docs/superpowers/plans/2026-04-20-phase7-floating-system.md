# Phase 7: Floating System "Snap & Morph" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** メインウィンドウとは独立した alwaysOnTop BrowserWindow として、3段階に変形する Floating System（FloatingTab → Toolbar → HandyDock）を実装する。

**Architecture:** 既存の `prismTileWin` パターンを踏台に、`floatingSystemWin` という新しい BrowserWindow を追加する。Snap 判定は Electron main process の `moved` イベントで行い、IPC（`fs:*` チャンネル）で React へ伝達する。ウィンドウの resize も React からの IPC 要求を main が実行する形で連携する。状態同期はメインウィンドウが色選択時・履歴追加時に `fs:sync` IPC をプッシュすることで行う。

**Tech Stack:** Electron (BrowserWindow IPC), React, framer-motion (spring animations, drag), Zustand (floatingStore), TypeScript

---

## ファイル構成

| ファイル | 変更 | 役割 |
|---|---|---|
| `electron/main.ts` | 修正 | floatingSystemWin 作成・snap 検出・IPC ハンドラ |
| `electron/preload.ts` | 修正 | `fs:*` IPC チャンネルを contextBridge に追加 |
| `src/App.tsx` | 修正 | `?floating-system=1` クエリで FloatingSystemView へルーティング |
| `src/store/floatingStore.ts` | 新規 | Floating ウィンドウのローカル状態管理 |
| `src/types/floating.ts` | 新規 | 共有型定義（FSColorData, SnapSide, FloatingState 等） |
| `src/components/floating/FloatingSystemView.tsx` | 新規 | State A/B/C のルーター。IPC 受信を担当 |
| `src/components/floating/LiquidDot.tsx` | 新規 | 色変化がじわっと混ざるアニメーションドット |
| `src/components/floating/FloatingTab.tsx` | 新規 | State A: 80×32px カプセル |
| `src/components/floating/FloatingToolbar.tsx` | 新規 | State B: 48px 縦長ツールバー |
| `src/components/floating/HandyDock.tsx` | 新規 | State C: 320px 横引き出しパネル |
| `src/components/layout/AppLayout.tsx` | 修正 | 色選択変化時に `fs:sync` を push |

---

## Task 1: 型定義 (src/types/floating.ts)

**Files:**
- Create: `src/types/floating.ts`

- [ ] **Step 1: 型ファイルを作成する**

```typescript
// src/types/floating.ts

export type SnapSide = 'none' | 'left' | 'right'
export type FloatingState = 'tab' | 'toolbar' | 'dock'

export interface FSColorData {
  hex: string
  alpha: number
  name: string
}

export interface FSHistoryItem {
  hex: string
  alpha: number
}

export interface FSFolderData {
  id: string
  name: string
  icon: string | null
  colors: FSColorData[]
}

export interface FSSyncPayload {
  currentColor: FSColorData
  previousColor: FSColorData | null
  history: FSHistoryItem[]
  folders: FSFolderData[]
}
```

- [ ] **Step 2: コミット**

```bash
git add src/types/floating.ts
git commit -m "feat(floating): add shared type definitions"
```

---

## Task 2: floatingStore (src/store/floatingStore.ts)

**Files:**
- Create: `src/store/floatingStore.ts`

- [ ] **Step 1: store を作成する**

```typescript
// src/store/floatingStore.ts
import { create } from 'zustand'
import type { FSColorData, FSHistoryItem, FSFolderData, FSSyncPayload, SnapSide, FloatingState } from '@/types/floating'

const DEFAULT_COLOR: FSColorData = { hex: '#3A7BD5', alpha: 1, name: 'カラーピッカー' }

interface FloatingStore {
  // 状態
  floatingState: FloatingState
  snapSide: SnapSide
  currentColor: FSColorData
  previousColor: FSColorData | null
  history: FSHistoryItem[]
  folders: FSFolderData[]
  activeFolderIndex: number // 0 = 履歴, 1以降 = folders[index-1]
  miniSlots: (string | null)[]  // 最大4スロット
  // アクション
  setFloatingState: (state: FloatingState) => void
  setSnapSide: (side: SnapSide) => void
  syncFromIPC: (payload: FSSyncPayload) => void
  swapColors: () => void
  setMiniSlot: (index: number, hex: string | null) => void
  setActiveFolderIndex: (index: number) => void
}

export const useFloatingStore = create<FloatingStore>((set, get) => ({
  floatingState: 'tab',
  snapSide: 'none',
  currentColor: DEFAULT_COLOR,
  previousColor: null,
  history: [],
  folders: [],
  activeFolderIndex: 0,
  miniSlots: [null, null, null, null],

  setFloatingState: (floatingState) => set({ floatingState }),

  setSnapSide: (snapSide) => set({ snapSide }),

  syncFromIPC: (payload) =>
    set((state) => ({
      previousColor: state.currentColor.hex !== payload.currentColor.hex
        ? state.currentColor
        : state.previousColor,
      currentColor: payload.currentColor,
      history: payload.history,
      folders: payload.folders,
    })),

  swapColors: () =>
    set((state) => {
      if (!state.previousColor) return state
      return {
        currentColor: state.previousColor,
        previousColor: state.currentColor,
      }
    }),

  setMiniSlot: (index, hex) =>
    set((state) => {
      const slots = [...state.miniSlots]
      slots[index] = hex
      return { miniSlots: slots }
    }),

  setActiveFolderIndex: (activeFolderIndex) => set({ activeFolderIndex }),
}))
```

- [ ] **Step 2: コミット**

```bash
git add src/store/floatingStore.ts
git commit -m "feat(floating): add floatingStore"
```

---

## Task 3: Electron IPC インフラ (main.ts + preload.ts)

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: main.ts に floatingSystemWin と IPC を追加する**

`electron/main.ts` の既存の `prismTileWin` 変数宣言の直後（8行目付近）に追加:

```typescript
// Floating System ウィンドウの参照
let floatingWin: BrowserWindow | null = null
```

`createPrismTileWindow` 関数の直後に追加:

```typescript
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

    floatingWin.webContents.send('fs:snap-change', { side })
  })

  floatingWin.on('closed', () => {
    floatingWin = null
  })

  return floatingWin
}
```

`app.whenReady().then(...)` ブロック内、既存の `prismShortcutOk` 登録の直後に追加:

```typescript
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
```

ファイル末尾の既存 IPC ハンドラ群に続けて追加:

```typescript
// Floating System: 開く
ipcMain.handle('fs:open', () => {
  createFloatingSystemWindow()
})

// Floating System: 閉じる
ipcMain.handle('fs:close', () => {
  if (floatingWin && !floatingWin.isDestroyed()) floatingWin.hide()
})

// Floating System: ウィンドウリサイズ要求（React → main）
ipcMain.handle('fs:request-resize', (_, { width, height }: { width: number; height: number }) => {
  if (!floatingWin || floatingWin.isDestroyed()) return
  const { workAreaSize: wa } = screen.getPrimaryDisplay()
  const bounds = floatingWin.getBounds()
  // 右スナップ時はウィンドウを右寄せに保つ
  const snapSide = bounds.x <= SNAP_THRESHOLD ? 'left'
    : bounds.x + bounds.width >= wa.width - SNAP_THRESHOLD ? 'right' : 'none'
  if (snapSide === 'right') {
    floatingWin.setBounds({ x: wa.width - width, y: bounds.y, width, height })
  } else {
    floatingWin.setSize(width, height)
  }
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
```

- [ ] **Step 2: preload.ts に fs:* チャンネルを追加する**

`electron/preload.ts` の `contextBridge.exposeInMainWorld` ブロックに追加:

```typescript
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
```

- [ ] **Step 3: TypeScript エラーがないか確認する**

```bash
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add electron/main.ts electron/preload.ts
git commit -m "feat(floating): add floatingSystemWin IPC infrastructure"
```

---

## Task 4: App.tsx ルーティング + FloatingSystemView スケルトン

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/floating/FloatingSystemView.tsx`

- [ ] **Step 1: App.tsx にルーティングを追加する**

`src/App.tsx` の既存 import と `isPrismTileMode` の直後に追加:

```typescript
import { FloatingSystemView } from '@/components/floating/FloatingSystemView'

const isFloatingSystemMode = new URLSearchParams(window.location.search).get('floating-system') === '1'
```

`App` コンポーネントの `if (isPrismTileMode)` ブロックの直後に追加:

```typescript
  if (isFloatingSystemMode) {
    return <FloatingSystemView />
  }
```

- [ ] **Step 2: FloatingSystemView スケルトンを作成する**

```typescript
// src/components/floating/FloatingSystemView.tsx
import { useEffect } from 'react'
import { useFloatingStore } from '@/store/floatingStore'
import type { FSSyncPayload } from '@/types/floating'
import { FloatingTab } from './FloatingTab'
import { FloatingToolbar } from './FloatingToolbar'

export function FloatingSystemView() {
  const { floatingState, setFloatingState, setSnapSide, syncFromIPC } = useFloatingStore()

  // IPC: snap 状態変化
  useEffect(() => {
    if (!window.electronAPI?.onFloatingSnapChange) return
    const unsub = window.electronAPI.onFloatingSnapChange(({ side }) => {
      setSnapSide(side)
      if (side !== 'none') {
        setFloatingState('toolbar')
        window.electronAPI?.requestFloatingResize({ width: 48, height: 280 })
      } else {
        setFloatingState('tab')
        window.electronAPI?.requestFloatingResize({ width: 80, height: 32 })
      }
    })
    return unsub
  }, [setSnapSide, setFloatingState])

  // IPC: 色・履歴・フォルダ同期
  useEffect(() => {
    if (!window.electronAPI?.onFloatingSync) return
    const unsub = window.electronAPI.onFloatingSync((raw) => {
      syncFromIPC(raw as FSSyncPayload)
    })
    return unsub
  }, [syncFromIPC])

  if (floatingState === 'tab') return <FloatingTab />
  return <FloatingToolbar />
}
```

- [ ] **Step 3: TypeScript エラーがないか確認する**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: コミット**

```bash
git add src/App.tsx src/components/floating/FloatingSystemView.tsx
git commit -m "feat(floating): add FloatingSystemView routing"
```

---

## Task 5: LiquidDot コンポーネント

**Files:**
- Create: `src/components/floating/LiquidDot.tsx`

- [ ] **Step 1: LiquidDot を作成する**

色変化時に旧色→新色がじわっと混ざるアニメーションドット。`framer-motion` の `animate` で `backgroundColor` をトランジションさせる。

```typescript
// src/components/floating/LiquidDot.tsx
import { motion } from 'framer-motion'

interface LiquidDotProps {
  hex: string
  size?: number
  className?: string
}

export function LiquidDot({ hex, size = 16, className = '' }: LiquidDotProps) {
  return (
    <motion.div
      animate={{ backgroundColor: hex }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '0.5px solid rgba(255,255,255,0.25)',
        flexShrink: 0,
      }}
    />
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/components/floating/LiquidDot.tsx
git commit -m "feat(floating): add LiquidDot component"
```

---

## Task 6: FloatingTab (State A)

**Files:**
- Create: `src/components/floating/FloatingTab.tsx`

- [ ] **Step 1: FloatingTab を作成する**

80×32px カプセル。ドラッグで画面上を自由に移動できる。クリックで Toolbar に切り替え（テスト用）。

```typescript
// src/components/floating/FloatingTab.tsx
import { motion } from 'framer-motion'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'

export function FloatingTab() {
  const { currentColor } = useFloatingStore()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        width: 80,
        height: 32,
        borderRadius: 20,
        background: 'rgba(18, 24, 38, 0.70)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 10,
        gap: 8,
        userSelect: 'none',
        WebkitAppRegion: 'drag',
        cursor: 'grab',
        overflow: 'hidden',
      } as React.CSSProperties}
    >
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <LiquidDot hex={currentColor.hex} size={14} />
      </div>
      <span
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.55)',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          letterSpacing: '0.02em',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {currentColor.hex.toUpperCase()}
      </span>
    </motion.div>
  )
}
```

- [ ] **Step 2: 動作確認手順**

1. `npm run electron:dev` でアプリ起動
2. `⌘+Shift+F` で Floating ウィンドウを開く
3. 80×32px のカプセルが画面中央上部に表示されることを確認
4. ドラッグで画面上を自由に移動できることを確認
5. 画面左端/右端に近づけると `moved` イベントが発火し、ツールバーへ変形することを確認

- [ ] **Step 3: コミット**

```bash
git add src/components/floating/FloatingTab.tsx
git commit -m "feat(floating): add FloatingTab (State A)"
```

---

## Task 7: FloatingToolbar (State B)

**Files:**
- Create: `src/components/floating/FloatingToolbar.tsx`

- [ ] **Step 1: FloatingToolbar を作成する**

48px 縦長ツールバー。スワップ領域 / クイックアクション / ミニスロット / Dock 展開ボタン。

```typescript
// src/components/floating/FloatingToolbar.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback } from 'react'
import { useFloatingStore } from '@/store/floatingStore'
import { LiquidDot } from './LiquidDot'
import { HandyDock } from './HandyDock'

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  })
}

function TactileButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title?: string
  children: React.ReactNode
}) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        borderRadius: 8,
        width: 34,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {children}
    </motion.button>
  )
}

export function FloatingToolbar() {
  const {
    currentColor, previousColor, snapSide,
    miniSlots, setMiniSlot, swapColors, setFloatingState, floatingState,
  } = useFloatingStore()
  const [copied, setCopied] = useState(false)
  const [dockOpen, setDockOpen] = useState(false)

  const handleCopyHex = useCallback(() => {
    copyToClipboard(currentColor.hex)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [currentColor.hex])

  const handleScreenPicker = useCallback(() => {
    window.electronAPI?.startScreenPicker()
  }, [])

  const handleRegisterSlot = useCallback((index: number) => {
    setMiniSlot(index, currentColor.hex)
  }, [currentColor.hex, setMiniSlot])

  const handleSlotSelect = useCallback((hex: string | null) => {
    if (!hex) return
    window.electronAPI?.floatingColorSelected(hex)
  }, [])

  const isDockLeft = snapSide === 'left'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isDockLeft ? 'row' : 'row-reverse',
        alignItems: 'flex-start',
        gap: 0,
        height: 280,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {/* ── Toolbar 本体（48px） ── */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0.6 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          width: 48,
          height: 280,
          borderRadius: 16,
          background: 'rgba(18, 24, 38, 0.70)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 0',
          gap: 8,
          WebkitAppRegion: 'drag',
          flexShrink: 0,
        } as React.CSSProperties}
      >
        {/* ── 1. スワップ領域（イラレ風） ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          {/* アクティブ色（大） */}
          <LiquidDot hex={currentColor.hex} size={24} />
          {/* サブ色（小・右下にオフセット） */}
          {previousColor && (
            <div style={{ position: 'relative', width: 24, height: 0 }}>
              <div style={{ position: 'absolute', top: -8, left: 6 }}>
                <LiquidDot hex={previousColor.hex} size={16} />
              </div>
            </div>
          )}
          {/* スワップボタン */}
          <motion.button
            onClick={swapColors}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            title="色を入れ替え"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
              marginTop: previousColor ? 10 : 0,
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
          >
            ⇄
          </motion.button>
        </div>

        {/* 仕切り */}
        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)' }} />

        {/* ── 2. クイックアクション ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <TactileButton onClick={handleScreenPicker} title="スポイト">
            💧
          </TactileButton>
          <TactileButton onClick={handleCopyHex} title="HEXをコピー">
            {copied ? '✓' : '📋'}
          </TactileButton>
        </div>

        {/* 仕切り */}
        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)' }} />

        {/* ── 3. ミニスロット（4色） ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {miniSlots.map((hex, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={() => hex ? handleSlotSelect(hex) : handleRegisterSlot(i)}
              onContextMenu={() => setMiniSlot(i, null)}
              title={hex ? `${hex}（右クリックで解除）` : '現在色を登録'}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: hex ?? 'rgba(255,255,255,0.06)',
                border: hex
                  ? '0.5px solid rgba(255,255,255,0.20)'
                  : '0.5px dashed rgba(255,255,255,0.20)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.35)',
                fontSize: 9,
                WebkitAppRegion: 'no-drag',
              } as React.CSSProperties}
            >
              {!hex && '+'}
            </motion.button>
          ))}
        </div>

        {/* 仕切り */}
        <div style={{ width: 28, height: 0.5, background: 'rgba(255,255,255,0.10)', marginTop: 'auto' }} />

        {/* ── 4. Dock 展開ボタン ── */}
        <TactileButton
          onClick={() => setDockOpen(v => !v)}
          title={dockOpen ? 'Dockを閉じる' : 'Dockを開く'}
        >
          📁
        </TactileButton>
      </motion.div>

      {/* ── Handy Dock（State C、Toolbarから横に展開） ── */}
      <AnimatePresence>
        {dockOpen && <HandyDock snapSide={snapSide} />}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/components/floating/FloatingToolbar.tsx
git commit -m "feat(floating): add FloatingToolbar (State B)"
```

---

## Task 8: HandyDock (State C)

**Files:**
- Create: `src/components/floating/HandyDock.tsx`

- [ ] **Step 1: HandyDock を作成する**

320px パネル。履歴 / フォルダ切り替え表示。5色が見える高さ（黄金比）、6色目以降はスクロール。

```typescript
// src/components/floating/HandyDock.tsx
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useFloatingStore } from '@/store/floatingStore'
import type { SnapSide } from '@/types/floating'

interface HandyDockProps {
  snapSide: SnapSide
}

function ColorRow({ hex, alpha, name }: { hex: string; alpha: number; name?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(hex)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const handleApply = () => {
    window.electronAPI?.floatingColorSelected(hex)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 10px',
        borderRadius: 8,
        cursor: 'default',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {/* 色玉 */}
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: hex,
          border: '0.5px solid rgba(255,255,255,0.15)',
          flexShrink: 0,
        }}
      />
      {/* HEX */}
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)', flex: 1 }}>
        {hex.toUpperCase()}
      </span>
      {/* コピー */}
      <button
        onClick={handleCopy}
        style={{
          background: 'none',
          border: 'none',
          color: copied ? 'rgba(80,176,211,0.9)' : 'rgba(255,255,255,0.35)',
          cursor: 'pointer',
          fontSize: 11,
          padding: '2px 4px',
        }}
        title="コピー"
      >
        {copied ? '✓' : '📋'}
      </button>
      {/* 適用 */}
      <button
        onClick={handleApply}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.35)',
          cursor: 'pointer',
          fontSize: 11,
          padding: '2px 4px',
        }}
        title="メインウィンドウで選択"
      >
        ↗
      </button>
    </div>
  )
}

export function HandyDock({ snapSide }: HandyDockProps) {
  const { history, folders, activeFolderIndex, setActiveFolderIndex, currentColor } = useFloatingStore()
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false)

  // 表示する色リスト: 0=履歴, 1以降=フォルダ
  const displayColors = activeFolderIndex === 0
    ? history.slice(0, 20)
    : (folders[activeFolderIndex - 1]?.colors ?? [])

  const activeFolder = activeFolderIndex > 0 ? folders[activeFolderIndex - 1] : null
  const folderLabel = activeFolderIndex === 0 ? '🕒 履歴' : `📁 ${activeFolder?.name ?? ''}`

  const handleSaveToFolder = () => {
    if (activeFolderIndex === 0) return // 履歴タブでは保存不可
    window.electronAPI?.floatingColorSelected(currentColor.hex)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: snapSide === 'left' ? -20 : 20, scaleX: 0.8 }}
      animate={{ opacity: 1, x: 0, scaleX: 1 }}
      exit={{ opacity: 0, x: snapSide === 'left' ? -20 : 20, scaleX: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        width: 320,
        height: 280,
        borderRadius: 16,
        background: 'rgba(18, 24, 38, 0.70)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: snapSide === 'left' ? '0 0 0 4px' : '0 4px 0 0',
        flexShrink: 0,
      } as React.CSSProperties}
    >
      {/* ── リストエリア（黄金比: 5色が見える高さ ≈ 195px） ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 2px',
          scrollbarWidth: 'none',
        }}
      >
        {displayColors.length === 0 ? (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 24 }}>
            色がありません
          </p>
        ) : (
          displayColors.map((c, i) => (
            <ColorRow
              key={`${'hex' in c ? c.hex : ''}-${i}`}
              hex={'hex' in c ? c.hex : (c as any).hex}
              alpha={'alpha' in c ? (c as any).alpha : 1}
              name={'name' in c ? (c as any).name : undefined}
            />
          ))
        )}
      </div>

      {/* ── フッター ── */}
      <div
        style={{
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {/* 履歴 / お気に入りタブ */}
        <button
          onClick={() => setActiveFolderIndex(0)}
          style={{
            background: activeFolderIndex === 0 ? 'rgba(80,176,211,0.20)' : 'none',
            border: activeFolderIndex === 0 ? '0.5px solid rgba(80,176,211,0.40)' : '0.5px solid transparent',
            borderRadius: 6,
            color: activeFolderIndex === 0 ? 'rgba(80,176,211,0.9)' : 'rgba(255,255,255,0.35)',
            fontSize: 11,
            padding: '3px 8px',
            cursor: 'pointer',
          }}
        >
          🕒
        </button>

        {/* フォルダ選択ドロップダウン */}
        <div style={{ position: 'relative', flex: 1 }}>
          <button
            onClick={() => setFolderDropdownOpen(v => !v)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: 'rgba(255,255,255,0.6)',
              fontSize: 10,
              padding: '3px 8px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {folderLabel}
            </span>
            <span>▼</span>
          </button>
          {folderDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                background: 'rgba(14, 19, 32, 0.95)',
                border: '0.5px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                padding: 4,
                marginBottom: 4,
                maxHeight: 140,
                overflowY: 'auto',
                zIndex: 10,
              }}
            >
              <button
                onClick={() => { setActiveFolderIndex(0); setFolderDropdownOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: activeFolderIndex === 0 ? 'rgba(80,176,211,0.15)' : 'none',
                  border: 'none', borderRadius: 5, padding: '4px 8px',
                  color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer',
                }}
              >
                🕒 履歴
              </button>
              {folders.map((folder, i) => (
                <button
                  key={folder.id}
                  onClick={() => { setActiveFolderIndex(i + 1); setFolderDropdownOpen(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: activeFolderIndex === i + 1 ? 'rgba(80,176,211,0.15)' : 'none',
                    border: 'none', borderRadius: 5, padding: '4px 8px',
                    color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  📁 {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* フォルダへ保存ボタン（履歴タブ時はグレーアウト） */}
        <button
          onClick={handleSaveToFolder}
          disabled={activeFolderIndex === 0}
          title="現在色をこのフォルダに保存"
          style={{
            background: activeFolderIndex > 0 ? 'rgba(80,176,211,0.20)' : 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(80,176,211,0.30)',
            borderRadius: 6,
            color: activeFolderIndex > 0 ? 'rgba(80,176,211,0.9)' : 'rgba(255,255,255,0.20)',
            fontSize: 14,
            padding: '3px 8px',
            cursor: activeFolderIndex > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          ➕
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/components/floating/HandyDock.tsx
git commit -m "feat(floating): add HandyDock (State C)"
```

---

## Task 9: メインウィンドウからの色同期

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

色が選択されたとき・履歴が更新されたときに `fs:push-sync` IPC を発火させる。

- [ ] **Step 1: AppLayout.tsx を修正する**

`AppLayout.tsx` の既存 import 群に追加:

```typescript
import { useHistoryStore } from '@/store/historyStore'
import { useFolderStore } from '@/store/folderStore'
import { useColorStore } from '@/store/colorStore'
import type { FSSyncPayload } from '@/types/floating'
```

`AppLayout` コンポーネント内の既存 hooks の後（`return` の前）に追加:

```typescript
  const { selectedColorId, colors } = useColorStore()
  const { historyColors } = useHistoryStore()
  const { folders } = useFolderStore()

  // Floating System への同期
  useEffect(() => {
    if (!window.electronAPI?.pushSyncToFloating) return
    const selectedColor = colors.find(c => c.id === selectedColorId)
    if (!selectedColor) return

    const payload: FSSyncPayload = {
      currentColor: {
        hex: selectedColor.hex,
        alpha: selectedColor.alpha,
        name: selectedColor.name ?? selectedColor.hex,
      },
      previousColor: null, // floatingStore 内で管理
      history: historyColors.slice(0, 20).map(h => ({ hex: h.hex, alpha: h.alpha })),
      folders: folders.map(f => ({
        id: f.id,
        name: f.name,
        icon: f.icon ?? null,
        colors: colors
          .filter(c => c.folder_id === f.id)
          .slice(0, 20)
          .map(c => ({ hex: c.hex, alpha: c.alpha, name: c.name ?? c.hex })),
      })),
    }
    window.electronAPI.pushSyncToFloating(payload)
  }, [selectedColorId, historyColors, folders, colors])
```

`selectedColorId` が `colorStore` に存在しない場合は `useColorStore` から `selectedColor` を取得する既存パターンを確認し、ない場合は以下を `colorStore.ts` で確認する:

> 注意: `selectedColorId` が `colorStore` に無い場合は、`useUIStore` から `selectedColor` を取得する既存パターンを使うこと。プロジェクト内の既存コードに合わせて書くこと。

- [ ] **Step 2: 動作確認手順**

1. `npm run electron:dev` で起動
2. `⌘+Shift+F` で Floating System を開く
3. メインウィンドウで色を選択する
4. Floating Tab の HEX 表示と LiquidDot の色が変わることを確認
5. Floating を画面端へドラッグ → Toolbar に変形することを確認
6. Toolbar の 📁 ボタン → HandyDock が横に展開することを確認
7. HandyDock の色をクリック → メインウィンドウで色が選択されることを確認

- [ ] **Step 3: TypeScript エラーがないか確認する**

```bash
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat(floating): sync color/history/folders from main window"
```

---

## Task 10: グローバルショートカット追加 + CLAUDE.md 自己更新

**Files:**
- Modify: `CLAUDE.md`（ショートカット表に追加）

- [ ] **Step 1: CLAUDE.md のショートカット表を更新する**

`## ショートカットキー` セクションの表に追加:

```
| Floating System 呼び出し | `⌘ + Shift + F` |
```

- [ ] **Step 2: 最終動作確認**

以下をすべて確認する:

1. **State A → B → C の遷移**: Tab → 画面端ドラッグ → Toolbar 変形 → 📁 → HandyDock 展開
2. **State B → A の遷移**: Toolbar をドラッグして画面中央へ移動 → Tab に戻る
3. **LiquidDot の色変化**: メインウィンドウで色を変えるたびに、FloatingTab / Toolbar の色がじわっと変わる
4. **スワップ**: Toolbar の ⇄ ボタンで currentColor と previousColor が入れ替わる
5. **ミニスロット**: 空スロットをクリックで現在色を登録、登録済みスロットをクリックで色を適用、右クリックで解除
6. **HandyDock フォルダ切り替え**: ▼ ドロップダウンで履歴 ↔ 各フォルダを切り替え

- [ ] **Step 3: 最終コミット**

```bash
git add CLAUDE.md
git commit -m "feat(floating): Phase 7 Floating System complete"
```

---

## Self-Review

### 1. Spec カバレッジ

| 仕様項目 | 対応タスク | ステータス |
|---|---|---|
| 独立 BrowserWindow | Task 3 | ✅ |
| alwaysOnTop | Task 3 (main.ts) | ✅ |
| 画面端スナップ（main process moved イベント） | Task 3 | ✅ |
| ウィンドウリサイズ連携 | Task 3 (fs:request-resize) + Task 4 | ✅ |
| State A: 80×24 カプセル | Task 6 | ✅ |
| LiquidDot じわっ混ざり | Task 5 | ✅ |
| State B: 48px 縦長ツールバー | Task 7 | ✅ |
| スワップ領域（イラレ風） | Task 7 | ✅ |
| クイックアクション（スポイト・HEXコピー） | Task 7 | ✅ |
| ミニスロット 4色 | Task 7 | ✅ |
| Dock 展開ボタン | Task 7 | ✅ |
| State C: 320px HandyDock | Task 8 | ✅ |
| 履歴デフォルト表示 | Task 8 | ✅ |
| フォルダ切り替えドロップダウン | Task 8 | ✅ |
| 5色黄金比 + 内部スクロール | Task 8 | ✅ |
| フッター保存ボタン | Task 8 | ✅ |
| Liquid Glass マテリアル（0.7/24px/0.5px ボーダー） | Task 6,7,8 | ✅ |
| Tactile Feedback scale:0.97 | Task 7 | ✅ |
| Spring stiffness:300 damping:30 | Task 7,8 | ✅ |
| 色同期（メイン → Floating IPC） | Task 9 | ✅ |
| 色選択（Floating → メイン IPC） | Task 8 | ✅ |

### 2. 注意点

- `AppLayout.tsx` の Task 9 では、`selectedColorId` が `colorStore` に存在するか確認してから実装すること。存在しない場合は `useUIStore` または他の既存パターンで選択色を取得すること。
- Floating ウィンドウは別 renderer process のため、Zustand store はメモリ共有されない。状態同期は必ず IPC 経由とすること。
- CLAUDE.md の影禁止ルールに従い、`box-shadow` は使わないこと（ガラス効果は `backdrop-filter` のみ）。
