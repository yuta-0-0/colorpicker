# Phosphor Icons Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** lucide-react を完全除去し @phosphor-icons/react へ移行。Icons.tsx をラッパーとして維持し、weight プロップで active 時に fill へ動的切り替えを実装する。

**Architecture:** Icons.tsx が唯一のアイコン定義ファイルとなり Phosphor を re-export する。全コンポーネントは Icons.tsx 経由でのみ import する。Sidebar の 3×3 グリッドは GridCell に Icon コンポーネント参照を持ち、アクティブ判定後に weight="fill" / "regular" を決定してレンダリングする。

**Tech Stack:** @phosphor-icons/react v2, TypeScript, React 18, Vite

---

## File Structure

| File | Change |
|------|--------|
| `src/components/ui/Icons.tsx` | **Rewrite** — Phosphor ラッパー（手書き SVG 全廃） |
| `src/components/sidebar/Sidebar.tsx` | **Modify** — lucide 削除、GridCell.Icon 型変更、weight 動的切り替え |
| `src/components/sidebar/FolderIconPicker.tsx` | **Rewrite** — Phosphor アイコンマップ、LucideIcon 型廃止 |
| `src/components/sidebar/FolderList.tsx` | **Modify** — Plus/X/CornerDownRight → Icons.tsx |
| `src/components/sidebar/PalettePopover.tsx` | **Modify** — Archive/Clock/Palette/TrendingUp → Icons.tsx |
| `src/components/views/FilterBar.tsx` | **Modify** — 同上 |
| `src/components/ui/BulkActionBar.tsx` | **Modify** — 6 icons → Icons.tsx |
| `src/components/ui/ShortcutHelpModal.tsx` | **Modify** — X のみ |
| `src/components/uitest/UITestView.tsx` | **Modify** — Save → IconFloppyDisk |
| `src/components/layout/AppLayout.tsx` | **Modify** — IconMenu → IconSidebarSimple |
| `src/components/color/ColorListItem.tsx` | **Modify** — IconStarFilled 廃止、weight="fill" に |
| `src/components/detail/DetailPanel.tsx` | **Modify** — IconStarFilled/IconArchiveOut 廃止 |

---

### Task 1: パッケージのインストール

**Files:** `package.json`

- [ ] **Step 1: @phosphor-icons/react をインストール**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker
npm install @phosphor-icons/react
```

Expected: `added N packages` が表示され、node_modules に @phosphor-icons が追加される。

- [ ] **Step 2: インストール確認**

```bash
node -e "const p = require('@phosphor-icons/react'); console.log('OK:', typeof p.Star)"
```

Expected: `OK: function`

---

### Task 2: Icons.tsx を Phosphor ラッパーに全面書き換え

**Files:**
- Modify: `src/components/ui/Icons.tsx`

- [ ] **Step 1: Icons.tsx を完全に書き換える**

```tsx
/**
 * Icons — @phosphor-icons/react のラッパー
 * アプリ内の全アイコンはここから import すること。
 * @phosphor-icons/react への直接 import はこのファイルのみ。
 *
 * weight prop: 'regular'（デフォルト）/ 'fill'（アクティブ状態）
 */
export {
  // ── 3×3 グリッド ──────────────────────────────────────────
  SquaresFour    as IconSquaresFour,    // すべての色
  Star           as IconStar,           // お気に入り（fill でアクティブ）
  MagicWand      as IconMagicWand,      // カラージェネレーター
  ImageSquare    as IconImageSquare,    // 画像から抽出
  Eyedropper     as IconEyedropper,     // スクリーンピッカー
  PlusCircle     as IconPlusCircle,     // 色を追加
  Layout         as IconLayout,         // UIテスト
  CircleHalf     as IconCircleHalf,     // コントラストチェッカー
  Swatches       as IconSwatches,       // フィルター / 並び順

  // ── ボトムドック ──────────────────────────────────────────
  Trash          as IconTrash,
  DownloadSimple as IconDownloadSimple,
  Sun            as IconSun,
  Moon           as IconMoon,

  // ── サイドバー Chrome ─────────────────────────────────────
  SidebarSimple    as IconSidebarSimple,
  MagnifyingGlass  as IconMagnifyingGlass,
  CaretRight       as IconCaretRight,
  FolderSimple     as IconFolder,
  Tag              as IconTag,
  Clock            as IconClock,
  Palette          as IconPalette,
  TrendUp          as IconTrendUp,
  Archive          as IconArchive,

  // ── アクション ───────────────────────────────────────────
  Plus                as IconPlus,
  X                   as IconX,
  Copy                as IconCopy,
  Check               as IconCheck,
  Pencil              as IconPencil,
  Lock                as IconLock,
  LockOpen            as IconLockOpen,
  ArrowUUpLeft        as IconArrowUUpLeft,     // アーカイブ解除（復元）
  ArrowBendDownRight  as IconArrowBendDownRight, // サブフォルダ追加
  FloppyDisk          as IconFloppyDisk,       // 保存

  // ── FAB / BulkActionBar ──────────────────────────────────
  Sparkle          as IconSparkle,
  Monitor          as IconMonitor,
  FolderSimplePlus as IconFolderSimplePlus,    // フォルダへ移動

  // ── ソート ───────────────────────────────────────────────
  ArrowUp   as IconSortAsc,
  ArrowDown as IconSortDesc,
} from '@phosphor-icons/react'

export type { Icon as PhosphorIcon } from '@phosphor-icons/react'
```

- [ ] **Step 2: 型チェックが通ることを確認**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: Icons.tsx に関するエラーは出ない（他ファイルはまだ lucide 参照があるためエラーが出る）。

---

### Task 3: FolderIconPicker.tsx を Phosphor に書き換え

**Files:**
- Modify: `src/components/sidebar/FolderIconPicker.tsx`

- [ ] **Step 1: FolderIconPicker.tsx を完全に書き換える**

```tsx
/**
 * FolderIconPicker — フォルダアイコン選択ポップオーバー（Phosphor Icons 版）
 * アイコンキーは Phosphor のコンポーネント名（クリーン移行: 旧 lucide キーとの後方互換なし）
 */
import {
  FolderSimple, FolderOpen, Star, Heart, Bookmark, Tag, Palette,
  ImageSquare, FilmStrip, MusicNote, Camera, Coffee, Lightning, Globe, House,
  Briefcase, Archive, Book, Package, Stack, GridNine,
  Feather, Leaf, Sun, Moon, Cloud, Umbrella, Diamond, Crown,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

interface IconEntry { key: string; Icon: PhosphorIcon }

const ICON_OPTIONS: IconEntry[] = [
  { key: 'FolderSimple', Icon: FolderSimple },
  { key: 'FolderOpen',   Icon: FolderOpen },
  { key: 'Star',         Icon: Star },
  { key: 'Heart',        Icon: Heart },
  { key: 'Bookmark',     Icon: Bookmark },
  { key: 'Tag',          Icon: Tag },
  { key: 'Palette',      Icon: Palette },
  { key: 'ImageSquare',  Icon: ImageSquare },
  { key: 'FilmStrip',    Icon: FilmStrip },
  { key: 'MusicNote',    Icon: MusicNote },
  { key: 'Camera',       Icon: Camera },
  { key: 'Coffee',       Icon: Coffee },
  { key: 'Lightning',    Icon: Lightning },
  { key: 'Globe',        Icon: Globe },
  { key: 'House',        Icon: House },
  { key: 'Briefcase',    Icon: Briefcase },
  { key: 'Archive',      Icon: Archive },
  { key: 'Book',         Icon: Book },
  { key: 'Package',      Icon: Package },
  { key: 'Stack',        Icon: Stack },
  { key: 'GridNine',     Icon: GridNine },
  { key: 'Feather',      Icon: Feather },
  { key: 'Leaf',         Icon: Leaf },
  { key: 'Sun',          Icon: Sun },
  { key: 'Moon',         Icon: Moon },
  { key: 'Cloud',        Icon: Cloud },
  { key: 'Umbrella',     Icon: Umbrella },
  { key: 'Diamond',      Icon: Diamond },
  { key: 'Crown',        Icon: Crown },
]

interface FolderIconPickerProps {
  currentIcon: string | null
  onSelect: (icon: string) => void
  onClose: () => void
}

export function FolderIconPicker({ currentIcon, onSelect, onClose }: FolderIconPickerProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute left-0 top-full mt-1 z-50 glass-popup rounded-xl p-2"
        style={{ width: 192 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs text-text-muted px-1 pb-1.5">アイコンを選択</p>
        <div className="grid grid-cols-6 gap-0.5">
          {ICON_OPTIONS.map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => { onSelect(key); onClose() }}
              className={[
                'w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-text-secondary hover:text-text-primary hover:bg-surface-overlay',
                currentIcon === key ? 'bg-accent/20 text-accent-soft ring-1 ring-accent/40' : '',
              ].join(' ')}
              title={key}
            >
              <Icon size={14} weight={currentIcon === key ? 'fill' : 'regular'} />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

/** アイコンキーから Phosphor コンポーネントを返す（FolderList 等で使用）。不明キーは FolderSimple にフォールバック */
export function FolderIconComponent({ iconKey, size = 13, weight = 'regular' }: { iconKey: string | null; size?: number; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' }) {
  const entry = ICON_OPTIONS.find((e) => e.key === iconKey)
  const Icon = entry?.Icon ?? FolderSimple
  return <Icon size={size} weight={weight} />
}
```

---

### Task 4: Sidebar.tsx の lucide 削除 + weight 動的切り替え実装

**Files:**
- Modify: `src/components/sidebar/Sidebar.tsx`

`Sidebar.tsx` の lucide import を削除し、Icons.tsx 経由に統一する。3×3 グリッドの `GridCell` 型を `icon: React.ReactNode`（pre-rendered）から `Icon: PhosphorIcon`（コンポーネント参照）に変更し、アクティブ状態に応じて `weight` を動的に渡す。

- [ ] **Step 1: Sidebar.tsx の import セクションを書き換える**

ファイル冒頭の import ブロック全体を以下に置き換える：

```tsx
import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  IconSquaresFour, IconStar, IconMagicWand,
  IconImageSquare, IconEyedropper, IconPlusCircle,
  IconLayout, IconCircleHalf, IconSwatches,
  IconTrash, IconDownloadSimple, IconSun, IconMoon,
  IconMagnifyingGlass, IconCaretRight, IconFolder, IconTag,
  IconClock, IconPalette, IconTrendUp, IconArchive,
  IconSortAsc, IconSortDesc,
  type PhosphorIcon,
} from '@/components/ui/Icons'
import { FolderList } from './FolderList'
import { TagList } from './TagList'
import { useUIStore, type ToneCategory, type ActiveMode } from '@/store/uiStore'
import { useColorStore } from '@/store/colorStore'
import { useHistoryStore } from '@/store/historyStore'
```

- [ ] **Step 2: SORT_OPTIONS と PalettePanel 内の lucide アイコンを Icons.tsx 経由に書き換える**

`SORT_OPTIONS` を以下に変更（`<Clock size={11} />` など pre-rendered を `PhosphorIcon` コンポーネント参照に変更）：

```tsx
const SORT_OPTIONS: { value: 'order' | 'hue' | 'used_count'; label: string; Icon: PhosphorIcon }[] = [
  { value: 'order',      label: '追加順', Icon: IconClock },
  { value: 'hue',        label: '色相順', Icon: IconPalette },
  { value: 'used_count', label: '使用順', Icon: IconTrendUp },
]
```

PalettePanel 内の SORT_OPTIONS レンダリング部分を以下に変更：

```tsx
{SORT_OPTIONS.map((opt) => (
  <button
    key={opt.value}
    type="button"
    title={opt.label}
    onClick={() => setSortBy(opt.value)}
    className={[
      'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
      sortBy === opt.value
        ? 'bg-accent/15 text-accent-soft'
        : 'text-text-muted hover:text-text-secondary hover:bg-white/8',
    ].join(' ')}
  >
    <opt.Icon size={11} weight={sortBy === opt.value ? 'fill' : 'regular'} />
  </button>
))}
```

PalettePanel 内の Archive ボタンを変更：

```tsx
<IconArchive size={11} weight={showArchived ? 'fill' : 'regular'} />
```

- [ ] **Step 3: GridCell 型と grid 配列を書き換える**

GridCell 型定義を変更（`icon: React.ReactNode` → `Icon: PhosphorIcon`）：

```tsx
type GridCell =
  | { kind: 'nav';    Icon: PhosphorIcon; label: string; section: typeof activeSection }
  | { kind: 'action'; Icon: PhosphorIcon; label: string; onClick: () => void; isActive?: boolean }

const grid: GridCell[] = [
  // 1段目：閲覧・生成
  { kind: 'nav',    Icon: IconSquaresFour, label: `すべての色 (${allCount})`, section: 'all' },
  { kind: 'nav',    Icon: IconStar,        label: `お気に入り (${favCount})`, section: 'favorites' },
  { kind: 'nav',    Icon: IconMagicWand,   label: 'カラージェネレーター',      section: 'generator' },
  // 2段目：取得・追加
  { kind: 'action', Icon: IconImageSquare, label: '画像から色を取得',          onClick: onImagePick },
  { kind: 'action', Icon: IconEyedropper,  label: 'スクリーンから色を取得',    onClick: onScreenPick },
  { kind: 'action', Icon: IconPlusCircle,  label: '色を追加',                 onClick: onAddColor },
  // 3段目：検証・設定
  { kind: 'nav',    Icon: IconLayout,      label: 'UIテスト',                 section: 'ui-test' },
  {
    kind: 'action',
    Icon: IconCircleHalf,
    label: 'コントラストチェッカー',
    isActive: activeMode === 'contrast',
    onClick: () => setActiveMode((activeMode === 'contrast' ? 'normal' : 'contrast') as ActiveMode),
  },
  {
    kind: 'action',
    Icon: IconSwatches,
    label: 'フィルター / 並び順',
    isActive: paletteOpen,
    onClick: () => setPaletteOpen((v) => !v),
  },
]
```

- [ ] **Step 4: グリッドのレンダリングを weight 動的切り替えに書き換える**

nav セル部分：

```tsx
if (cell.kind === 'nav') {
  const isActive = activeSection === cell.section && !activeFolderId
  return (
    <button
      key={i}
      type="button"
      title={cell.label}
      onClick={() => setActiveSection(cell.section)}
      className={[glassBase, isActive ? glassActive : glassDefault].join(' ')}
    >
      <cell.Icon size={14} weight={isActive ? 'fill' : 'regular'} />
    </button>
  )
}
// action セル
return (
  <button
    key={i}
    type="button"
    title={cell.label}
    onClick={cell.onClick}
    className={[glassBase, cell.isActive ? glassActive : glassDefault].join(' ')}
  >
    <cell.Icon size={14} weight={cell.isActive ? 'fill' : 'regular'} />
  </button>
)
```

- [ ] **Step 5: 検索・フォルダ・タグ・ボトムドックの lucide アイコンを書き換える**

検索アイコン（`<Search size={...} />` → `<IconMagnifyingGlass size={...} />`）:
```tsx
// 検索ボタン（閉じた状態）
<IconMagnifyingGlass size={12} />
// 検索インプット左端アイコン
<IconMagnifyingGlass size={11} />
```

フォルダアコーディオン（`<ChevronRight size={10} />` → `<IconCaretRight size={10} />`、`<Folder size={9} />` → `<IconFolder size={9} />`）:
```tsx
<span className={['transition-transform duration-150', foldersOpen ? 'rotate-90' : ''].join(' ')}>
  <IconCaretRight size={10} />
</span>
<span className="text-[9px] font-semibold uppercase tracking-widest flex items-center gap-1">
  <IconFolder size={9} />フォルダ
</span>
```

タグアコーディオン（`<ChevronRight size={10} />` → `<IconCaretRight size={10} />`、`<Tag size={9} />` → `<IconTag size={9} />`）:
```tsx
<span className={['transition-transform duration-150', tagsOpen ? 'rotate-90' : ''].join(' ')}>
  <IconCaretRight size={10} />
</span>
<span className="text-[9px] font-semibold uppercase tracking-widest flex items-center gap-1">
  <IconTag size={9} />タグ
</span>
```

ボトムドック（Trash2/Download/Sun/Moon → Icons.tsx 版）:
```tsx
{/* ゴミ箱 */}
<IconTrash size={14} weight={activeSection === 'trash' && !activeFolderId ? 'fill' : 'regular'} />

{/* ビジュアル書き出し */}
<IconDownloadSimple size={14} />

{/* テーマ切替 */}
{theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
```

---

### Task 5: FolderList.tsx の lucide を Icons.tsx に差し替え

**Files:**
- Modify: `src/components/sidebar/FolderList.tsx`

- [ ] **Step 1: import を書き換える**

```tsx
// 変更前
import { Plus, X, CornerDownRight } from 'lucide-react'

// 変更後
import { IconPlus, IconX, IconArrowBendDownRight } from '@/components/ui/Icons'
```

- [ ] **Step 2: 3箇所のアイコン JSX を置き換える**

サブフォルダ追加ボタン（`<CornerDownRight size={10} strokeWidth={1.5} />` → `<IconArrowBendDownRight size={10} />`）:
```tsx
<IconArrowBendDownRight size={10} />
```

削除ボタン（`<X size={10} strokeWidth={1.5} />` → `<IconX size={10} />`）:
```tsx
<IconX size={10} />
```

フォルダ追加ボタン（`<Plus size={12} strokeWidth={1.5} />` → `<IconPlus size={12} />`）:
```tsx
<IconPlus size={12} />
```

---

### Task 6: PalettePopover.tsx + FilterBar.tsx の lucide を Icons.tsx に差し替え

**Files:**
- Modify: `src/components/sidebar/PalettePopover.tsx`
- Modify: `src/components/views/FilterBar.tsx`

両ファイルは同じアイコン（Archive, Clock, Palette, TrendingUp）を同じ用途で使用している。

- [ ] **Step 1: PalettePopover.tsx の import を書き換える**

```tsx
// 変更前
import { Archive, Clock, Palette, TrendingUp } from 'lucide-react'
import { useUIStore, type ToneCategory } from '@/store/uiStore'
import { IconSortAsc, IconSortDesc } from '@/components/ui/Icons'

// 変更後
import { useUIStore, type ToneCategory } from '@/store/uiStore'
import { IconArchive, IconClock, IconPalette, IconTrendUp, IconSortAsc, IconSortDesc } from '@/components/ui/Icons'
```

- [ ] **Step 2: PalettePopover.tsx の SORT_OPTIONS と Archive ボタンを書き換える**

SORT_OPTIONS（型も変更）:
```tsx
const SORT_OPTIONS: { value: 'order' | 'hue' | 'used_count'; label: string; icon: React.ReactNode }[] = [
  { value: 'order',      label: '追加順', icon: <IconClock size={12} /> },
  { value: 'hue',        label: '色相順', icon: <IconPalette size={12} /> },
  { value: 'used_count', label: '使用順', icon: <IconTrendUp size={12} /> },
]
```

Archive ボタン:
```tsx
<IconArchive size={11} weight={showArchived ? 'fill' : 'regular'} />
```

- [ ] **Step 3: FilterBar.tsx の import を書き換える**

```tsx
// 変更前
import { Archive, Clock, Palette, TrendingUp } from 'lucide-react'
import { useUIStore, type ToneCategory } from '@/store/uiStore'
import { IconSortAsc, IconSortDesc } from '@/components/ui/Icons'

// 変更後
import { useUIStore, type ToneCategory } from '@/store/uiStore'
import { IconArchive, IconClock, IconPalette, IconTrendUp, IconSortAsc, IconSortDesc } from '@/components/ui/Icons'
```

- [ ] **Step 4: FilterBar.tsx の SORT_OPTIONS と Archive ボタンを書き換える**

```tsx
const SORT_OPTIONS = [
  { value: 'order',      label: '追加順', icon: <IconClock size={12} /> },
  { value: 'hue',        label: '色相順', icon: <IconPalette size={12} /> },
  { value: 'used_count', label: '使用順', icon: <IconTrendUp size={12} /> },
] as const
```

Archive ボタン:
```tsx
<IconArchive size={11} weight={showArchived ? 'fill' : 'regular'} />
```

---

### Task 7: BulkActionBar.tsx の lucide を Icons.tsx に差し替え

**Files:**
- Modify: `src/components/ui/BulkActionBar.tsx`

- [ ] **Step 1: import を書き換える**

```tsx
// 変更前
import { Sparkles, Monitor, Trash2, Archive, FolderInput, X } from 'lucide-react'

// 変更後
import { IconSparkle, IconMonitor, IconTrash, IconArchive, IconFolderSimplePlus, IconX } from '@/components/ui/Icons'
```

- [ ] **Step 2: FabBtn の呼び出し箇所を 5箇所書き換える**

```tsx
{/* ジェネレーター */}
<FabBtn icon={<IconSparkle size={13} />} label="ジェネレーター" onClick={() => setActiveSection('generator')} />

{/* UIテスト */}
<FabBtn icon={<IconMonitor size={13} />} label="UIテスト" onClick={() => setActiveSection('ui-test')} />

{/* アーカイブ */}
<FabBtn icon={<IconArchive size={13} />} label="アーカイブ" onClick={handleBulkArchive} />

{/* フォルダ移動（トリガーボタン） */}
<FabBtn icon={<IconFolderSimplePlus size={13} />} label="フォルダ移動" onClick={() => setShowFolderMenu((v) => !v)} isActive={showFolderMenu} />

{/* 削除 */}
<FabBtn icon={<IconTrash size={13} />} label="ゴミ箱へ" onClick={handleBulkDelete} danger />
```

キャンセルボタン（X）:
```tsx
<IconX size={13} />
```

---

### Task 8: ShortcutHelpModal.tsx + UITestView.tsx の lucide を差し替え

**Files:**
- Modify: `src/components/ui/ShortcutHelpModal.tsx`
- Modify: `src/components/uitest/UITestView.tsx`

- [ ] **Step 1: ShortcutHelpModal.tsx の import と JSX を変更**

```tsx
// 変更前
import { X } from 'lucide-react'

// 変更後
import { IconX } from '@/components/ui/Icons'
```

JSX:
```tsx
// 変更前
<X size={14} strokeWidth={1.5} />

// 変更後
<IconX size={14} />
```

- [ ] **Step 2: UITestView.tsx の import と JSX を変更**

```tsx
// 変更前
import { Save } from 'lucide-react'

// 変更後
import { IconFloppyDisk } from '@/components/ui/Icons'
```

JSX（Save 使用箇所）:
```tsx
// 変更前
<Save size={13} strokeWidth={1.5} />

// 変更後
<IconFloppyDisk size={13} />
```

---

### Task 9: AppLayout.tsx の IconMenu → IconSidebarSimple

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: import を変更**

```tsx
// 変更前
import { IconMenu } from '@/components/ui/Icons'

// 変更後
import { IconSidebarSimple } from '@/components/ui/Icons'
```

- [ ] **Step 2: 2箇所の JSX を変更（Electron ドラッグバー + Web ヘッダー）**

Electron ドラッグバー内のトグルボタン:
```tsx
<IconSidebarSimple size={14} />
```

Web ヘッダー内のトグルボタン:
```tsx
<IconSidebarSimple size={15} />
```

---

### Task 10: ColorListItem.tsx の IconStarFilled を weight="fill" に変換

**Files:**
- Modify: `src/components/color/ColorListItem.tsx`

- [ ] **Step 1: import を変更（IconStarFilled を削除）**

```tsx
// 変更前
import { IconCopy, IconStar, IconStarFilled, IconX, IconLock } from '@/components/ui/Icons'

// 変更後
import { IconCopy, IconStar, IconX, IconLock } from '@/components/ui/Icons'
```

- [ ] **Step 2: お気に入りボタンの JSX を weight 切り替えに変更**

```tsx
// 変更前
{color.is_favorite ? <IconStarFilled size={13} /> : <IconStar size={13} />}

// 変更後
<IconStar size={13} weight={color.is_favorite ? 'fill' : 'regular'} />
```

---

### Task 11: DetailPanel.tsx の IconStarFilled / IconArchiveOut を Phosphor 版に変換

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`

- [ ] **Step 1: import を変更**

```tsx
// 変更前
import {
  IconStar, IconStarFilled,
  IconLock, IconLockOpen,
  IconArchive, IconArchiveOut,
  IconX, IconCopy, IconCheck, IconPencil,
} from '@/components/ui/Icons'

// 変更後
import {
  IconStar,
  IconLock, IconLockOpen,
  IconArchive, IconArrowUUpLeft,
  IconX, IconCopy, IconCheck, IconPencil,
} from '@/components/ui/Icons'
```

- [ ] **Step 2: お気に入りボタン（2箇所）を weight 切り替えに変更**

DetailPanel ヘッダーのお気に入りボタン:
```tsx
// 変更前
{color.is_favorite ? <IconStarFilled size={14} /> : <IconStar size={14} />}

// 変更後
<IconStar size={14} weight={color.is_favorite ? 'fill' : 'regular'} />
```

- [ ] **Step 3: アーカイブ解除アイコンを変更**

```tsx
// 変更前
{color.is_archived ? <IconArchiveOut size={14} /> : <IconArchive size={14} />}

// 変更後
{color.is_archived ? <IconArrowUUpLeft size={14} /> : <IconArchive size={14} />}
```

---

### Task 12: lucide-react をアンインストール + 最終確認

**Files:** `package.json`

- [ ] **Step 1: lucide-react をアンインストール**

```bash
npm uninstall lucide-react
```

Expected: `removed N packages`

- [ ] **Step 2: lucide の残存 import がないことを確認**

```bash
grep -r "lucide-react" /Users/yutashimizu/Projects/apps/colorpicker/src --include="*.tsx" --include="*.ts"
```

Expected: 出力なし（0件）

- [ ] **Step 3: 型チェック**

```bash
npx tsc --noEmit 2>&1
```

Expected: 出力なし（エラー0件）

- [ ] **Step 4: ビルド確認**

```bash
npx vite build 2>&1 | tail -15
```

Expected: `✓ built in` が3回表示（renderer + main + preload）、エラーなし

- [ ] **Step 5: コミット**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker
git add -A
git commit -m "$(cat <<'EOF'
feat: migrate icon library from lucide-react to @phosphor-icons/react

Icons.tsx をラッパーとして維持しつつ全アイコンを Phosphor に移行。
3×3 グリッド・ボトムドック・詳細パネルで weight="fill" による
アクティブ状態の動的切り替えを実装。FolderIconPicker のキー名も
Phosphor 命名規則にクリーン移行。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
