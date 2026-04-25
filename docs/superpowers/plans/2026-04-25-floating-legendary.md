# Floating System "完全生命体" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Floating System を「デスクトップに実在する光学デバイス」へ昇華させる 7ステップ全完遂。

**Architecture:** 既存の FloatingTab / FloatingToolbar / HandyDock 構成を拡張。Step 2 のレイアウト再構成が最大変更箇所。layoutId を使った Iris Descent（Step 1）は FloatingSystemView に LayoutGroup を追加して LiquidDot を橋渡しする。IPC は既存 `fs:*` / `screen-picker:*` チャンネルを最大限再利用。

**Tech Stack:** Electron IPC, React, framer-motion (layoutId / AnimatePresence), Zustand, TypeScript

---

## ファイル構成

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/components/ui/Icons.tsx` | 修正 | `BookmarkSimple` アイコンを追加 |
| `src/store/floatingStore.ts` | 修正 | `pushMiniSlot` 重複排除・`promoteSlot` 追加 |
| `src/components/floating/LiquidDot.tsx` | 修正 | `layoutId` prop を追加 |
| `src/components/floating/FloatingSystemView.tsx` | 修正 | `LayoutGroup` ラップで layoutId を有効化 |
| `src/components/floating/FloatingTab.tsx` | 修正 | LiquidDot に `layoutId="fs-active-dot"` 付与 |
| `src/components/floating/FloatingToolbar.tsx` | 修正（大） | サブカラー・硝子孔スロット・テーマ切替・Noren・スロット昇格 |
| `electron/main.ts` | 修正 | screen-picker 中も floatingWin を hide しない |

---

## Task 1: Icons + floatingStore 更新

**Files:**
- Modify: `src/components/ui/Icons.tsx`
- Modify: `src/store/floatingStore.ts`

### Step 1: BookmarkSimple アイコンを Icons.tsx に追加

`src/components/ui/Icons.tsx` の `// ── アクション ─` セクション末尾に追加:

```typescript
  BookmarkSimple      as IconBookmarkSimple,       // 詳細保存（のれん展開）
```

import 元は `@phosphor-icons/react` — 既存の他アイコンと同列で追記。

### Step 2: floatingStore に `promoteSlot` と `pushMiniSlot` 重複排除を追加

`src/store/floatingStore.ts` の `interface FloatingStore` に追記:

```typescript
  /** スロット内の色を Active に昇格し、そのスロットを空にする */
  promoteSlot: (hex: string) => void
```

`create<FloatingStore>` 内の `pushMiniSlot` を以下で置き換え（重複排除付き）:

```typescript
  pushMiniSlot: (hex) =>
    set((state) => {
      // 既にスロット内に同じ色があれば何もしない
      if (state.miniSlots.some(s => s === hex)) return state
      return { miniSlots: [hex, ...state.miniSlots.slice(0, 3)] }
    }),
```

`setActiveFolderIndex` の直後に `promoteSlot` を追加:

```typescript
  promoteSlot: (hex) =>
    set((state) => ({
      previousColor: state.currentColor,
      currentColor: { hex, alpha: 1, name: hex },
      // そのスロットは空に（メインへ昇格したので消える）
      miniSlots: state.miniSlots.map(s => (s === hex ? null : s)),
    })),
```

### Step 3: コミット

```bash
git add src/components/ui/Icons.tsx src/store/floatingStore.ts
git commit -m "feat(floating): add BookmarkSimple icon, dedup pushMiniSlot, add promoteSlot"
```

---

## Task 2: FloatingToolbar — レイアウト再構成

**Files:**
- Modify: `src/components/floating/FloatingToolbar.tsx`

全体を以下のように書き直す。変更点まとめ:
- `previousColor` サブカラードットを LiquidDot 横に表示（Step 2, 2段目）
- 硝子孔スロット: 空時は `background: transparent` + 超薄ボーダーのみ（Step 2, 3-6段目）
- テーマ切替ボタン（Step 2, 8段目）: `setTheme` IPC を呼ぶ
- スロット昇格: 塗りスロットクリック → `promoteSlot(hex)` → `floatingColorSelected(hex)`（Step 3）
- ＋ボタン: 既に同じ色がある場合はビジュアルで非活性（Step 3 重複排除は store 側で吸収済み）

`src/components/floating/FloatingToolbar.tsx` の `FloatingToolbar` 関数内 destructuring を変更:

```typescript
  const {
    currentColor, previousColor, snapSide,
    miniSlots, setMiniSlot, pushMiniSlot, promoteSlot,
    setFloatingState, setPendingSaveAfterPick,
  } = useFloatingStore()
```

`isDark` / `glass` の直後にテーマ切替ハンドラを追加:

```typescript
  const handleToggleTheme = useCallback(() => {
    window.electronAPI?.setTheme(isDark ? 'light' : 'dark')
  }, [isDark])
```

スロット昇格ハンドラを修正（`handleSlotPointerUp` の短押し分岐):

```typescript
  const handleSlotPointerUp = useCallback((i: number, hex: string | null) => {
    const t = slotTimers.current.get(i); if (!t) return
    clearTimeout(t); slotTimers.current.delete(i)
    if (hex) {
      // 塗りスロット短押し → Active に昇格
      promoteSlot(hex)
      window.electronAPI?.floatingColorSelected(hex)
    } else {
      handleRegisterSlot(i)
    }
  }, [promoteSlot, handleRegisterSlot])
```

JSX — 地層 2（LiquidDot）を以下に書き替え（サブカラー追加）:

```tsx
        {/* ── 地層 2: LiquidDot（メイン）＋ サブカラー ── */}
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, flexShrink: 0, position: 'relative', zIndex: 1,
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
          onDoubleClick={handleDotDoubleClick}
          title="現在色（ダブルクリックで即保存）"
        >
          <LiquidDot hex={currentColor.hex} size={24} layoutId="fs-active-dot" />
          {previousColor && (
            <LiquidDot hex={previousColor.hex} size={14} style={{ opacity: 0.6 }} />
          )}
        </div>
```

JSX — 地層 3〜6（硝子孔スロット）を以下で置き換え:

```tsx
        {/* ── 地層 3〜6: 硝子孔スロット ── */}
        {miniSlots.map((hex, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.88 }}
            transition={SPRING_TAP}
            onPointerDown={() => handleSlotPointerDown(i)}
            onPointerUp={() => handleSlotPointerUp(i, hex)}
            onPointerLeave={() => handleSlotPointerLeave(i)}
            onContextMenu={(e) => { e.preventDefault(); setMiniSlot(i, null) }}
            title={hex
              ? `${hex}（クリック:Active昇格 / 長押し:上書き / 右クリック:解除）`
              : '（＋で登録）'}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: hex ?? 'transparent',
              // 空: 1.4px 面取りエッジ表現 — 超薄ボーダーのみ
              border: hex
                ? 'none'
                : `0.7px solid ${glass.textExtra}`,
              cursor: 'pointer',
              flexShrink: 0, position: 'relative', zIndex: 1,
              WebkitAppRegion: 'no-drag', padding: 0, display: 'block',
            } as React.CSSProperties}
          />
        ))}
```

JSX — 地層 8（テーマ切替）を Dock ボタンの直前に挿入:

```tsx
        {/* ── 地層 8: ダーク/ライト切替 ── */}
        <TactileButton
          onClick={handleToggleTheme}
          title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          glass={glass}
        >
          {isDark ? <IconSun size={13} /> : <IconMoon size={13} />}
        </TactileButton>
```

### Step コミット

```bash
git add src/components/floating/FloatingToolbar.tsx
git commit -m "feat(floating): sub-color dot, hollow glass slots, theme toggle, slot promotion"
```

---

## Task 3: FloatingToolbar 内 Noren + クイック保存

**Files:**
- Modify: `src/components/floating/FloatingToolbar.tsx`

### Step 1: state と handler 追加

`FloatingToolbar` の state 宣言部に追加:

```typescript
  const [norenOpen, setNorenOpen]   = useState(false)
  const [norenName, setNorenName]   = useState('')
  const norenInputRef = useRef<HTMLInputElement>(null)
```

`handleDotDoubleClick` の直後に以下を追加:

```typescript
  // ── のれん開閉 ────────────────────────────────────────────
  const handleOpenNoren = useCallback(() => {
    setNorenName(currentColor.name ?? currentColor.hex)
    setNorenOpen(true)
    setTimeout(() => norenInputRef.current?.focus(), 80)
  }, [currentColor])

  const handleCloseNoren = useCallback(() => {
    setNorenOpen(false)
    setNorenName('')
  }, [])

  // ── のれん保存確定 ────────────────────────────────────────
  const handleNorenSave = useCallback(() => {
    window.electronAPI?.floatingSaveColor?.({
      hex: currentColor.hex,
      alpha: currentColor.alpha,
      name: norenName || currentColor.hex,
    })
    window.electronAPI?.floatingColorSelected(currentColor.hex)
    specular.flash()
    handleCloseNoren()
  }, [currentColor, norenName, specular, handleCloseNoren])

  // ── 空スロットクリック → クイック保存 ─────────────────
  // （handleSlotPointerUp の短押し分岐で hex === null の場合に呼ぶ）
  const handleQuickSave = useCallback(() => {
    window.electronAPI?.floatingSaveColor?.({
      hex: currentColor.hex,
      alpha: currentColor.alpha,
      name: currentColor.name ?? currentColor.hex,
    })
    window.electronAPI?.floatingColorSelected(currentColor.hex)
    specular.flash()
  }, [currentColor, specular])
```

`handleSlotPointerUp` を再修正（空スロット短押し = クイック保存）:

```typescript
  const handleSlotPointerUp = useCallback((i: number, hex: string | null) => {
    const t = slotTimers.current.get(i); if (!t) return
    clearTimeout(t); slotTimers.current.delete(i)
    if (hex) {
      promoteSlot(hex)
      window.electronAPI?.floatingColorSelected(hex)
    } else {
      // 空スロット短押し → クイック保存
      handleQuickSave()
      handleRegisterSlot(i)  // スロットへも登録
    }
  }, [promoteSlot, handleQuickSave, handleRegisterSlot])
```

### Step 2: のれん JSX を地層 2 と 地層 3 の間に挿入

地層 2 の `</div>` の直後に挿入（ツールバー本体 motion.div の内側）:

```tsx
        {/* ── BookmarkSimple ボタン（のれん展開トリガー）── */}
        <TactileButton
          onClick={norenOpen ? handleCloseNoren : handleOpenNoren}
          title={norenOpen ? 'のれんを閉じる' : '詳細保存（名前・タグ）'}
          glass={glass}
          active={norenOpen}
        >
          <IconBookmarkSimple size={13} />
        </TactileButton>

        {/* ── のれんパネル（height 0 → auto スライド展開）── */}
        <AnimatePresence>
          {norenOpen && (
            <motion.div
              key="noren"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.6 }}
              style={{
                overflow: 'hidden', width: '100%',
                flexShrink: 0, position: 'relative', zIndex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 6, padding: '6px 4px',
                  borderTop: `0.5px solid ${glass.divider}`,
                  borderBottom: `0.5px solid ${glass.divider}`,
                }}
              >
                <input
                  ref={norenInputRef}
                  value={norenName}
                  onChange={(e) => setNorenName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNorenSave() }}
                  placeholder="色の名前"
                  style={{
                    width: 36, background: glass.buttonBg,
                    border: `0.5px solid ${glass.buttonBorder}`,
                    borderRadius: 5, padding: '3px 5px',
                    fontSize: 9, color: glass.textPrimary,
                    outline: 'none', boxSizing: 'border-box',
                    textAlign: 'center',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = glass.accentBorder }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = glass.buttonBorder }}
                />
                <motion.button
                  onClick={handleNorenSave}
                  whileTap={{ scale: 0.90 }}
                  transition={SPRING_TAP}
                  style={{
                    background: glass.accentBg,
                    border: `0.5px solid ${glass.accentBorder}`,
                    borderRadius: 5, padding: '3px 8px',
                    fontSize: 9, color: glass.accentColor,
                    cursor: 'pointer', fontWeight: 500,
                  } as React.CSSProperties}
                >
                  保存
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div style={{ width: 28, height: 0.5, background: glass.divider, position: 'relative', zIndex: 1, flexShrink: 0 }} />
```

### Step 3: コミット

```bash
git add src/components/floating/FloatingToolbar.tsx
git commit -m "feat(floating): noren detail-save panel + quick-save on empty slot (Step 4)"
```

---

## Task 4: Eyedropper 安定性（Step 6）

**Files:**
- Modify: `electron/main.ts`

### Step 1: floatingWin を hide しない

`electron/main.ts` の `screen-picker:start` ハンドラ（line 242 付近）を修正:

```typescript
ipcMain.handle('screen-picker:start', async (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender)
  screenPickerReturnToFloating = (senderWin === floatingWin)

  // ── Step 6: floatingWin は hide しない ──
  // transparent: true のウィンドウは EyeDropper の邪魔にならない。
  // スポイト中も「手元に機材がある安心感」を維持する。
  // （以前の floatingWin.hide() を削除）

  const mainWins = BrowserWindow.getAllWindows().filter(
    w => w !== floatingWin && w !== prismTileWin && !w.isDestroyed()
  )
  mainWins.forEach(w =>
    w.webContents.executeJavaScript(EYEDROPPER_JS, true).catch(() => {
      // executeJavaScript 失敗時のフォールバックは不要（floatingWin は show 済み）
    })
  )

  return null
})
```

`screen-picker:picked` ハンドラも修正（show 処理が不要になるため整理）:

```typescript
ipcMain.on('screen-picker:picked', (_, { hex }: { hex: string }) => {
  if (screenPickerReturnToFloating) {
    // floatingWin は hide していないので show は不要
    if (floatingWin && !floatingWin.isDestroyed() && hex) {
      floatingWin.webContents.send('fs:color-from-picker', { hex })
    }
    screenPickerReturnToFloating = false
  }
})
```

### Step 2: コミット

```bash
git add electron/main.ts
git commit -m "fix(floating): keep floatingWin visible during eyedropper (Step 6)"
```

---

## Task 5: layoutId Descent アニメーション（Step 1）

**Files:**
- Modify: `src/components/floating/LiquidDot.tsx`
- Modify: `src/components/floating/FloatingSystemView.tsx`
- Modify: `src/components/floating/FloatingTab.tsx`
- (FloatingToolbar は Task 2 で既に `layoutId="fs-active-dot"` 付与済み)

### Step 1: LiquidDot に layoutId prop を追加

`src/components/floating/LiquidDot.tsx` を全体置き換え:

```typescript
// src/components/floating/LiquidDot.tsx
import { motion } from 'framer-motion'

interface LiquidDotProps {
  hex: string
  size?: number
  className?: string
  layoutId?: string
  style?: React.CSSProperties
}

export function LiquidDot({ hex, size = 16, className = '', layoutId, style }: LiquidDotProps) {
  return (
    <motion.div
      layoutId={layoutId}
      initial={{ backgroundColor: hex }}
      animate={{ backgroundColor: hex }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: '0.5px solid rgba(255,255,255,0.25)',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
```

### Step 2: FloatingSystemView に LayoutGroup を追加

`src/components/floating/FloatingSystemView.tsx`:

```typescript
import { useEffect, useRef } from 'react'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { useFloatingStore } from '@/store/floatingStore'
import type { FSSyncPayload } from '@/types/floating'
import { FloatingTab } from './FloatingTab'
import { FloatingToolbar } from './FloatingToolbar'

export function FloatingSystemView() {
  const {
    floatingState,
    setSnapSide,
    syncFromIPC,
    setCurrentColorFromPicker,
    pendingSaveAfterPick,
    setPendingSaveAfterPick,
  } = useFloatingStore()

  const saveAfterPickRef = useRef(pendingSaveAfterPick)
  useEffect(() => {
    saveAfterPickRef.current = pendingSaveAfterPick
  }, [pendingSaveAfterPick])

  useEffect(() => {
    if (!window.electronAPI?.onFloatingSnapChange) return undefined
    const unsub = window.electronAPI.onFloatingSnapChange(({ side }) => {
      setSnapSide(side)
    })
    return unsub
  }, [setSnapSide])

  useEffect(() => {
    if (!window.electronAPI?.onFloatingSync) return undefined
    const unsub = window.electronAPI.onFloatingSync((raw) => {
      syncFromIPC(raw as FSSyncPayload)
    })
    return unsub
  }, [syncFromIPC])

  useEffect(() => {
    if (!window.electronAPI?.onFloatingColorFromPicker) return undefined
    const unsub = window.electronAPI.onFloatingColorFromPicker(({ hex }) => {
      if (!hex) return
      setCurrentColorFromPicker(hex)
      if (saveAfterPickRef.current) {
        window.electronAPI?.floatingColorSelected(hex)
        setPendingSaveAfterPick(false)
      }
    })
    return unsub
  }, [setCurrentColorFromPicker, setPendingSaveAfterPick])

  return (
    // LayoutGroup: FloatingTab と FloatingToolbar の layoutId="fs-active-dot" を
    // framer-motion に認識させ、A↔B 遷移時にドットが物理的に降下・上昇する
    <LayoutGroup>
      <AnimatePresence initial={false}>
        {floatingState === 'tab'
          ? <FloatingTab key="tab" />
          : <FloatingToolbar key="toolbar" />
        }
      </AnimatePresence>
    </LayoutGroup>
  )
}
```

### Step 3: FloatingTab の LiquidDot に layoutId 付与

`src/components/floating/FloatingTab.tsx` の LiquidDot 使用箇所:

```tsx
        <LiquidDot hex={currentColor.hex} size={14} layoutId="fs-active-dot" />
```

### Step 4: TypeScript エラー確認

```bash
npx tsc --noEmit
```

Expected: エラーなし

### Step 5: コミット

```bash
git add src/components/floating/LiquidDot.tsx \
        src/components/floating/FloatingSystemView.tsx \
        src/components/floating/FloatingTab.tsx
git commit -m "feat(floating): layoutId descent animation — dot physically moves A↔B (Step 1)"
```

---

## Task 6: 最終動作確認 + コミット

### 確認チェックリスト

- [ ] **State A→B**: ダブルクリックで iris morph 開花。ドットが TabCenter からToolbar 2段目へ降下するように見える（layoutId）
- [ ] **State B→A**: 縮小ボタンで iris morph 収束。逆降下（上昇）
- [ ] **サブカラー**: Toolbar 2段目に mainDot(24px) + previousDot(14px 60%透明) が縦に並ぶ
- [ ] **硝子孔**: 空スロットが透明で薄ボーダーのみ（影なし・塗りなし）
- [ ] **テーマ切替**: Sun/Moon ボタンでダーク↔ライトが切り替わる（全ウィンドウ連動）
- [ ] **スロット昇格**: 塗りスロットをクリックするとその色が Active になる
- [ ] **重複排除**: ＋ボタンを押して同じ色を 2 回追加しようとしても 2 個目は無視
- [ ] **のれん**: BookmarkSimple をクリックで高さ 0→auto スライド展開。入力中も dot は見える。Enter or 保存ボタンで flash＋閉じる
- [ ] **クイック保存**: 空スロットの短押しで現在色を即保存＋スロット登録
- [ ] **Eyedropper**: スポイトボタン押下後も Floating ウィンドウが消えない
- [ ] **Step 7 flash**: のれん保存・コピー・クイック保存 成功時に SpecularBorder が鼓動

### 最終コミット

```bash
git add -A
git commit -m "feat(floating): Liquid Glass 2.0 完全生命体 — 全7ステップ完遂"
```

---

## Self-Review

### 1. Spec カバレッジ

| 仕様 | タスク | 備考 |
|---|---|---|
| Step 1: 虹彩変身（ドット降下） | Task 5 (layoutId) | clip-path + layoutId FLIP |
| Step 1: ドットが消える瞬間ゼロ | 既存実装で達成済み | EXIT_FRAMES に circle(0%) なし |
| Step 2: サブカラー並置 | Task 2 | previousColor 復活 |
| Step 2: 硝子孔スロット | Task 2 | transparent + 0.7px border |
| Step 2: Dark/Light 切替ボタン | Task 2 | setTheme IPC 再利用 |
| Step 3: スロット昇格 | Task 2 | promoteSlot アクション |
| Step 3: 重複排除 | Task 1 | pushMiniSlot で弾く |
| Step 3: ダブルクリック記憶 | Task 2 | floatingSaveColor + floatingColorSelected |
| Step 4: のれん展開（Toolbar内）| Task 3 | height 0→auto spring |
| Step 4: クイック保存 | Task 3 | 空スロット短押し |
| Step 4: 詳細保存（BookmarkSimple）| Task 3 | のれんパネル |
| Step 5: 1.4px Chamfer | 既存 SpecularBorder | 変更不要 |
| Step 5: 色の記憶 30% 混合 | 既存 makeSpecular | 変更不要 |
| Step 5: Inner Shadow | 既存 boxShadow token | 変更不要 |
| Step 6: Eyedropper 安定性 | Task 4 | floatingWin.hide() 削除 |
| Step 6: Light Mode 同期 | usePrefersDark 既存実装 | 変更不要 |
| Step 7: Save Flash | 既存 specular.flash() | Toolbar は既存, Noren = Task 3 で flash 追加 |

### 2. 注意点

- `LiquidDot` の `layoutId` と `motion.div` の `animate.backgroundColor` が競合しないか確認。framer-motion は layout 系と animate 系を分離管理するため通常は問題なし。
- Task 4 の eyedropper 変更により、スポイト中に Floating が前面に残るため、ユーザーが意図しない Floating UI をクリックしてしまう可能性がある。対処: スポイト起動中は `setIgnoreMouseEvents(true)` で入力を透過させる（main.ts 追加 IPC）。この拡張は post-launch で対応可。
- FloatingToolbar の高さ `TOOLBAR_H = 420` は、のれんが展開すると内容が溢れる可能性がある。のれんの高さ（約 90px）分、`TOOLBAR_H` の値か `overflow: hidden` の扱いを確認すること。現状の Toolbar は `overflow: hidden` であるため、のれん展開には `overflow: visible` か `overflow: auto` が必要。 → のれん部分は Toolbar 内の flex-column の途中に入るため、Toolbar 全体の高さが足りなければ `requestFloatingResize` でウィンドウを伸ばすか、TOOLBAR_H を 540 に増やす必要がある。Task 3 実装時に実際の高さを確認すること。
