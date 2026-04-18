# Phase 3.9 — Phosphor Icons Migration Design

## Goal

`lucide-react` を完全に除去し、`@phosphor-icons/react` へ移行する。
Icons.tsx をラッパーとして維持し、weight プロップによるアクティブ状態の動的切り替えを実装する。

## Architecture

**方針 B（Icons.tsx ラッパー）** を採用。
`src/components/ui/Icons.tsx` が唯一のアイコン定義ファイルとなり、全コンポーネントはここから import する。
`@phosphor-icons/react` への直接 import は Icons.tsx のみに限定することで、将来のライブラリ交換コストを最小化する。

## Active State Pattern

```tsx
// 旧（lucide）: 2種類のコンポーネントで条件分岐
{isActive ? <IconStarFilled size={14} /> : <IconStar size={14} />}

// 新（Phosphor）: 同一コンポーネント + weight で動的切り替え
<IconStar size={14} weight={isActive ? 'fill' : 'regular'} />
```

デフォルトは `weight="regular"`。アクティブ時のみ `weight="fill"` に切り替える。

## Icons.tsx Export Map

```
@phosphor-icons/react          → Icons.tsx エイリアス
─────────────────────────────────────────────────────
SquaresFour                    → IconSquaresFour
Star                           → IconStar
MagicWand                      → IconMagicWand
ImageSquare                    → IconImageSquare
Eyedropper                     → IconEyedropper
PlusCircle                     → IconPlusCircle
Layout                         → IconLayout
CircleHalf                     → IconCircleHalf
Swatches                       → IconSwatches
Trash                          → IconTrash
DownloadSimple                 → IconDownloadSimple
Sun                            → IconSun
Moon                           → IconMoon
SidebarSimple                  → IconSidebarSimple
MagnifyingGlass                → IconMagnifyingGlass
CaretRight                     → IconCaretRight
FolderSimple                   → IconFolder
Tag                            → IconTag
Clock                          → IconClock
Palette                        → IconPalette
TrendUp                        → IconTrendUp
Archive                        → IconArchive
Plus                           → IconPlus
X                              → IconX
Copy                           → IconCopy
Check                          → IconCheck
Pencil                         → IconPencil
Lock                           → IconLock
LockOpen                       → IconLockOpen
ArrowBendDownRight             → IconArrowBendDownRight
FloppyDisk                     → IconFloppyDisk
Sparkle                        → IconSparkle
Monitor                        → IconMonitor
FolderSimplePlus               → IconFolderSimplePlus
ArrowUp                        → IconSortAsc
ArrowDown                      → IconSortDesc
```

## 3×3 Grid Mapping

| セル         | lucide（旧）  | Phosphor（新）  |
|------------|-------------|--------------|
| すべての色      | LayoutGrid  | SquaresFour  |
| お気に入り      | Star        | Star         |
| ジェネレーター   | Sparkles    | MagicWand    |
| 画像から抽出    | Image       | ImageSquare  |
| スクリーンピッカー | Crosshair   | Eyedropper   |
| 追加          | Plus        | PlusCircle   |
| UIテスト      | Monitor     | Layout       |
| コントラスト    | Contrast    | CircleHalf   |
| フィルター      | Library     | Swatches     |

## FolderIconPicker Key Mapping

| lucide key（旧） | Phosphor key（新） |
|---------------|----------------|
| Folder        | FolderSimple   |
| FolderOpen    | FolderOpen     |
| Star          | Star           |
| Heart         | Heart          |
| Bookmark      | Bookmark       |
| Tag           | Tag            |
| Palette       | Palette        |
| Image         | ImageSquare    |
| Film          | FilmStrip      |
| Music         | MusicNote      |
| Camera        | Camera         |
| Coffee        | Coffee         |
| Zap           | Lightning      |
| Globe         | Globe          |
| Home          | House          |
| Briefcase     | Briefcase      |
| Archive       | Archive        |
| Book          | Book           |
| Package       | Package        |
| Layers        | Stack          |
| Grid3x3       | GridNine       |
| Feather       | Feather        |
| Leaf          | Leaf           |
| Sun           | Sun            |
| Moon          | Moon           |
| Cloud         | Cloud          |
| Umbrella      | Umbrella       |
| Diamond       | Diamond        |
| Crown         | Crown          |

フォールバック: `FolderSimple`（不明キーの場合）

## Files to Change

1. `src/components/ui/Icons.tsx` — Phosphor ラッパーに全面書き換え（手書き SVG 全廃）
2. `src/components/sidebar/Sidebar.tsx` — lucide import 削除、Icons.tsx 経由に統一、weight 切り替え実装
3. `src/components/sidebar/FolderIconPicker.tsx` — Phosphor アイコンマップに置き換え、LucideIcon 型廃止
4. `src/components/sidebar/FolderList.tsx` — Plus, X, CornerDownRight → Icons.tsx
5. `src/components/sidebar/PalettePopover.tsx` — Archive, Clock, Palette, TrendingUp → Icons.tsx
6. `src/components/views/FilterBar.tsx` — 同上
7. `src/components/ui/BulkActionBar.tsx` — Sparkle, Monitor, Trash, Archive, FolderSimplePlus, X
8. `src/components/ui/ShortcutHelpModal.tsx` — X のみ
9. `src/components/uitest/UITestView.tsx` — Save → FloppyDisk

## Package Changes

```bash
npm install @phosphor-icons/react
npm uninstall lucide-react
```

## Decisions Log

- **方針 B（ラッパー維持）採用**: ライブラリ依存を Icons.tsx に集約。将来の交換コスト最小化。
- **FolderIconPicker キー刷新**: クローズドベータ中のため後方互換不要。Phosphor 命名規則に統一。
- **weight="regular" をデフォルト**: fill に比べ視認性が高く、アクティブ状態の差分が明確。
