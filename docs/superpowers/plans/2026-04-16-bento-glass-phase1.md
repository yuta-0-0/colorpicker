# Bento Glass Edition — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CSS変数をBento Glassカラー定義に更新し、AppLayoutをBento Grid（独立コンテナ）構造に移行する。

**Architecture:** `index.css` の色変数を `#FDFDFD`/`#0B0C12` ベースに書き換え、AppLayoutの flex レイアウトを gap-4 + p-4 の Bento Grid に変換。各パネルに `rounded-2xl + backdrop-blur(24px) + opacity 0.8` を適用。ヘッダーを廃止し、サイドバー左上の80px空白とドラッグ領域をルートで確保。

**Tech Stack:** React, TypeScript, Tailwind CSS v3, CSS custom properties, Electron (-webkit-app-region)

---

## File Map

| File | Change |
|------|--------|
| `src/index.css` | CSS変数更新、`.bento-pane` クラス追加 |
| `src/components/layout/AppLayout.tsx` | Bento Grid構造に書き換え、ヘッダー廃止 |
| `src/components/sidebar/Sidebar.tsx` | 上部80px空白 + toggle ボタン位置調整（読み取り確認） |

---

### Task 1: CSS変数とBentoパネルクラスの更新

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: CSS変数（:root Dark）を更新**

`:root` ブロックを以下に差し替える：
```css
:root {
  --color-bg:               11 12 18;        /* #0B0C12 — ベース背景 */
  --color-surface:          9 12 29;         /* #090C1D — Bentoパネル */
  --color-surface-raised:   13 17 36;        /* #0D1124 */
  --color-surface-overlay:  16 20 42;        /* #10142A */
  --color-surface-sidebar:  9 12 29;         /* #090C1D */
  --color-border:           255 255 255;     /* border uses /5 opacity */
  --color-border-subtle:    255 255 255;
  --color-border-sidebar:   255 255 255;
  --color-text-primary:     255 255 255;
  --color-text-secondary:   148 154 178;
  --color-text-muted:       82 88 108;
  --color-accent:           10 62 216;       /* #0a3ed8 */
  --color-accent-hover:     8 50 184;
  --color-accent-soft:      122 160 255;
  --color-accent-ring:      0 206 255;
}
```

- [ ] **Step 2: CSS変数（Light Mode）を更新**

`[data-theme="light"]` ブロックを以下に差し替える：
```css
[data-theme="light"] {
  --color-bg:               253 253 253;     /* #FDFDFD — ベース背景 */
  --color-surface:          236 239 250;     /* #ECEFFA — Bentoパネル */
  --color-surface-raised:   244 246 255;     /* #F4F6FF */
  --color-surface-overlay:  240 243 255;     /* #F0F3FF */
  --color-surface-sidebar:  236 239 250;     /* #ECEFFA */
  --color-border:           0 0 0;
  --color-border-subtle:    0 0 0;
  --color-border-sidebar:   0 0 0;
  --color-text-primary:     13 13 13;
  --color-text-secondary:   80 88 112;
  --color-text-muted:       148 158 180;
  --color-accent:           10 62 216;
  --color-accent-hover:     8 50 184;
  --color-accent-soft:      10 62 216;
  --color-accent-ring:      0 206 255;
}
```

- [ ] **Step 3: body背景を `--color-bg` に変更、`.bento-pane` クラスを追加**

`@layer base` の body スタイルを更新し、`.bento-pane` を `@layer components` に追加：

```css
@layer base {
  * { box-sizing: border-box; }
  body {
    background: rgb(var(--color-bg));
    color: rgb(var(--color-text-primary));
    font-family: inherit;
    margin: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  /* ... scrollbar styles remain unchanged ... */
}

@layer components {
  /* Bento Pane — 全コンテナ共通 */
  .bento-pane {
    background: rgba(var(--color-surface), 0.8);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-radius: 1rem; /* rounded-2xl */
  }
}
```

- [ ] **Step 4: `html, body, #root` の transparent 指定を削除してbaseに追従させる**

```css
/* Bento Glass: html/body を --color-bg で塗る（transparent を廃止） */
html, body, #root {
  min-height: 100vh;
  background: rgb(var(--color-bg));
}
```

- [ ] **Step 5: `.list-item` / `.list-item-active` クラスを追加**

```css
/* リストアイテム — Bento Glass 選択ロジック */
.list-item {
  background: transparent;
  border: 1px solid rgba(0,0,0,0.05);
  border-radius: 10px;
  transition: background 80ms ease, border-color 80ms ease, box-shadow 80ms ease;
}
:root:not([data-theme="light"]) .list-item,
[data-theme="dark"] .list-item {
  border-color: rgba(255,255,255,0.05);
}
.list-item:hover {
  background: rgba(var(--color-surface-overlay), 0.5);
}
.list-item-active {
  background: transparent !important;
  border: 2px solid rgb(14,165,233); /* sky-500 */
  box-shadow:
    0 4px 16px rgba(14,165,233,0.25),
    0 8px 32px rgba(0,0,0,0.2);
}
```

- [ ] **Step 6: コミット**
```bash
git add src/index.css
git commit -m "feat: Phase1 CSS変数をBento Glass定義に更新、.bento-pane と .list-item クラスを追加"
```

---

### Task 2: AppLayout の Bento Grid 化

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: ルート div を Bento Grid レイアウトに変更**

現在の `return` ブロック冒頭の div を以下に変更する。
`body` 背景が `--color-bg` なので、ルート div は `flex h-screen gap-4 p-4 overflow-hidden` のみ：

```tsx
return (
  <div
    className="flex h-screen overflow-hidden"
    style={{ background: 'rgb(var(--color-bg))', gap: '12px', padding: '12px' }}
  >
    {/* モバイル用オーバーレイ（変更なし） */}
    {isSidebarOpen && (
      <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
    )}
```

- [ ] **Step 2: サイドバーコンテナを Bento Pane 化**

現在の `<div className={['fixed inset-y-0 left-0 ...']}>` を以下に置き換える：

```tsx
{/* ── Sidebar Bento Pane ── */}
{!sidebarCollapsed && (
  <aside
    className="bento-pane flex-shrink-0 flex flex-col overflow-hidden"
    style={{ width: `${sidebarWidth}px`, minWidth: 140, maxWidth: 280 }}
  >
    {/* 信号機セーフエリア（Electronのみ）— 上部80px × 28px のドラッグ可能空白 */}
    <div
      className="app-drag flex-shrink-0"
      style={{ height: 28, marginLeft: 0 }}
    />
    <Sidebar
      onVisualExport={() => setShowVisualExport(true)}
      width={sidebarWidth}
      onResize={setSidebarWidth}
      collapsed={sidebarCollapsed}
      onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
    />
  </aside>
)}
```

- [ ] **Step 3: メインエリアを Bento Pane 化・ヘッダーを内包型に変更**

現在の `<div className="flex-1 flex flex-col min-w-0 overflow-hidden">` + `<header ...>` を以下に置き換える。
ヘッダーを独立 `<header>` から、メインパネル内の上部バーに変更する：

```tsx
{/* ── Main Bento Pane ── */}
<div className="bento-pane flex-1 flex flex-col min-w-0 overflow-hidden">

  {/* 内部ヘッダー（ドラッグ領域 + コントロール） */}
  <header
    className="app-drag flex items-center gap-2 flex-shrink-0 rounded-t-2xl"
    style={{
      paddingLeft: sidebarCollapsed && (window as Window & { electronAPI?: unknown }).electronAPI ? '84px' : '12px',
      paddingRight: '12px',
      paddingTop: '10px',
      paddingBottom: '10px',
    }}
  >
    {/* サイドバートグル */}
    <button
      type="button"
      onClick={() => setSidebarCollapsed((v) => !v)}
      title={sidebarCollapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
      className="no-drag flex-shrink-0 p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/8 transition-colors"
    >
      <IconMenu size={15} />
    </button>
    <h1 className="text-sm font-medium text-text-primary flex-1 select-none no-drag">{sectionTitle}</h1>

    {!isGenerator && !isUITest && !isTrash && (
      <>
        <div className="no-drag"><ViewToggle mode={viewMode} onChange={setViewMode} /></div>
        <div className="relative no-drag">
          <button
            onClick={() => setShowMenu((v) => !v)}
            type="button"
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-full glow-accent-btn transition-all tactile"
          >
            ＋ 追加
          </button>
          {showMenu && (
            <AddMenuPopover
              onSelectText={() => setShowAddModal(true)}
              onSelectImage={() => setShowImageModal(true)}
              onSelectScreen={handleScreenPick}
              onClose={handleCloseMenu}
            />
          )}
        </div>
      </>
    )}

    {/* Prism Tile ボタン（Electronのみ） */}
    {(window as Window & { electronAPI?: { platform?: string; openPrismTile?: () => void } }).electronAPI?.platform === 'darwin' && (
      <button
        type="button"
        onClick={() => (window as Window & { electronAPI?: { openPrismTile?: () => void } }).electronAPI?.openPrismTile?.()}
        className="no-drag p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors"
        title="Prism Tile を開く (⌘+Shift+T)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="12" height="8" rx="2"/>
          <path d="M5 5V4a3 3 0 0 1 6 0v1"/>
        </svg>
      </button>
    )}

    {/* テーマトグル */}
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="no-drag p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors"
      title={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>

    <div className="no-drag">
      <ExportMenu
        onVisualExport={() => setShowVisualExport(true)}
        onPaletteExport={() => setShowPaletteExport(true)}
        onImport={() => setShowImport(true)}
        onExportAll={() => {
          const filename = `colorpicker-backup-${new Date().toISOString().slice(0, 10)}.json`
          downloadAllDataJSON(colors, folders, filename)
        }}
        onShortcutHelp={() => setShowShortcutHelp(true)}
      />
    </div>
  </header>

  {!isGenerator && !isUITest && !isTrash && <FilterBar />}

  <div className="flex-1 flex flex-col overflow-hidden">
    {isBulkMode && <BulkActionBar />}
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {isGenerator ? (
          <GeneratorView />
        ) : isUITest ? (
          <UITestView />
        ) : isTrash ? (
          <TrashView />
        ) : colorsLoading ? (
          <Center full>
            <p className="text-text-muted text-sm">読み込み中...</p>
          </Center>
        ) : viewMode === 'list' ? (
          <ListView colors={displayColors} />
        ) : (
          <GalleryView colors={displayColors} />
        )}
      </div>
      <AnimatePresence>
        {isDetailPanelOpen && selectedColor && (
          <motion.div
            key="detail-panel"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <DetailPanel color={selectedColor} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
</div>
{/* モーダル群（変更なし） */}
```

- [ ] **Step 4: コミット**
```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: Phase1 AppLayoutをBento Grid構造に移行（独立コンテナ・gap-4・ドラッグ領域確保）"
```

---

### Task 3: TypeScriptビルド確認

- [ ] **Step 1: 型チェック実行**
```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit 2>&1 | head -40
```
Expected: エラー0件 or 既存の無関係エラーのみ

- [ ] **Step 2: 問題があればその場で修正してから再コミット**
