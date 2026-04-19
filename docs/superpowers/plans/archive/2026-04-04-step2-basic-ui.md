# Step 2: 基本UI（サイドバー・メインエリア・詳細パネル）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** モックデータを使って、サイドバー・メインエリア（リスト/ギャラリービュー）・詳細パネルの静的UIシェルを構築する。

**Architecture:** コンポーネントを `layout/` `sidebar/` `color/` `views/` `detail/` `ui/` に責務分割。UIの状態は Zustand（uiStore）で管理。Step 3 でSupabase接続に差し替えるため、このステップではモックデータを使用する。

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS 3（カスタムダークトークン）, Zustand

---

## ファイル構成

```
src/
├── App.tsx                          # 修正：認証後にAppLayoutを表示
├── mock/
│   └── colors.ts                    # 開発用モックデータ
├── store/
│   └── uiStore.ts                   # UI状態（選択色・ビューモード・サイドバー開閉）
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx            # サイドバー + メインエリア + 詳細パネル
│   ├── sidebar/
│   │   ├── Sidebar.tsx              # サイドバー全体
│   │   ├── SearchBar.tsx            # 検索バー
│   │   ├── NavItem.tsx              # ナビゲーションアイテム
│   │   ├── FolderList.tsx           # フォルダ一覧（スタブ）
│   │   └── TagList.tsx              # タグ一覧（スタブ）
│   ├── color/
│   │   ├── ColorSwatch.tsx          # 丸アイコン（全画面共通）
│   │   ├── ColorListItem.tsx        # リストビューの1行
│   │   └── ColorGalleryItem.tsx     # ギャラリービューの1アイコン
│   ├── views/
│   │   ├── ViewToggle.tsx           # リスト/ギャラリー切り替えタブ
│   │   ├── FilterBar.tsx            # フィルターバー
│   │   ├── ListView.tsx             # リストビュー
│   │   └── GalleryView.tsx          # ギャラリービュー
│   └── detail/
│       └── DetailPanel.tsx          # 詳細パネル（右サイド）
```

---

### Task 1: 依存関係追加（Zustand）と モックデータ

**Files:**
- Modify: `package.json`
- Create: `src/mock/colors.ts`
- Create: `src/store/uiStore.ts`

- [ ] **Step 1: Zustand をインストールする**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
npm install zustand
```

期待される出力: `added 1 package` のようなメッセージ（エラーなし）

- [ ] **Step 2: src/mock/colors.ts を作成する**

```typescript
import type { Color } from '@/types/database'

export const MOCK_COLORS: Color[] = [
  {
    id: '1',
    user_id: 'mock',
    folder_id: null,
    hex: '#3A7BD5',
    alpha: 1.0,
    c: 73, m: 44, y: 0, k: 17,
    cmyk_source: 'manual',
    name: 'コーラルブルー',
    spot_color: null,
    memo: 'メインブランドカラー',
    is_locked: false,
    is_favorite: true,
    is_archived: false,
    order: 0,
    used_count: 12,
    last_used_at: '2026-04-01T10:00:00Z',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
  },
  {
    id: '2',
    user_id: 'mock',
    folder_id: null,
    hex: '#F2C94C',
    alpha: 1.0,
    c: null, m: null, y: null, k: null,
    cmyk_source: null,
    name: 'サンイエロー',
    spot_color: 'PANTONE 115 C',
    memo: null,
    is_locked: false,
    is_favorite: false,
    is_archived: false,
    order: 1,
    used_count: 5,
    last_used_at: '2026-03-28T10:00:00Z',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-28T10:00:00Z',
  },
  {
    id: '3',
    user_id: 'mock',
    folder_id: null,
    hex: '#27AE60',
    alpha: 1.0,
    c: 79, m: 0, y: 55, k: 32,
    cmyk_source: 'converted',
    name: 'フォレストグリーン',
    spot_color: null,
    memo: null,
    is_locked: true,
    is_favorite: false,
    is_archived: false,
    order: 2,
    used_count: 3,
    last_used_at: null,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: '4',
    user_id: 'mock',
    folder_id: null,
    hex: '#EB5757',
    alpha: 0.8,
    c: null, m: null, y: null, k: null,
    cmyk_source: null,
    name: 'コーラルレッド',
    spot_color: null,
    memo: 'エラーカラー',
    is_locked: false,
    is_favorite: true,
    is_archived: false,
    order: 3,
    used_count: 8,
    last_used_at: '2026-04-02T10:00:00Z',
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-04-02T10:00:00Z',
  },
  {
    id: '5',
    user_id: 'mock',
    folder_id: null,
    hex: '#9B51E0',
    alpha: 1.0,
    c: null, m: null, y: null, k: null,
    cmyk_source: null,
    name: 'ロイヤルパープル',
    spot_color: 'DIC-43',
    memo: null,
    is_locked: false,
    is_favorite: false,
    is_archived: true,
    order: 4,
    used_count: 1,
    last_used_at: null,
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
  },
  {
    id: '6',
    user_id: 'mock',
    folder_id: null,
    hex: '#1A1A2E',
    alpha: 1.0,
    c: null, m: null, y: null, k: null,
    cmyk_source: null,
    name: 'ミッドナイトネイビー',
    spot_color: null,
    memo: null,
    is_locked: false,
    is_favorite: false,
    is_archived: false,
    order: 5,
    used_count: 0,
    last_used_at: null,
    created_at: '2026-04-03T10:00:00Z',
    updated_at: '2026-04-03T10:00:00Z',
  },
]
```

- [ ] **Step 3: src/store/uiStore.ts を作成する**

```typescript
import { create } from 'zustand'
import type { Color } from '@/types/database'

export type ViewMode = 'list' | 'gallery'
export type NavSection = 'all' | 'favorites' | 'history' | 'generator'

interface UIStore {
  // ビューモード
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // 選択中の色
  selectedColorId: string | null
  setSelectedColorId: (id: string | null) => void

  // 詳細パネルの開閉
  isDetailPanelOpen: boolean
  setIsDetailPanelOpen: (open: boolean) => void

  // モバイル用サイドバー開閉
  isSidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // ナビゲーションセクション
  activeSection: NavSection
  setActiveSection: (section: NavSection) => void

  // アクティブフォルダ
  activeFolderId: string | null
  setActiveFolderId: (id: string | null) => void

  // アーカイブ表示
  showArchived: boolean
  setShowArchived: (show: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),

  selectedColorId: null,
  setSelectedColorId: (id) => set({ selectedColorId: id, isDetailPanelOpen: id !== null }),

  isDetailPanelOpen: false,
  setIsDetailPanelOpen: (open) => set({ isDetailPanelOpen: open }),

  isSidebarOpen: false,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  activeSection: 'all',
  setActiveSection: (section) => set({ activeSection: section, activeFolderId: null }),

  activeFolderId: null,
  setActiveFolderId: (id) => set({ activeFolderId: id, activeSection: 'all' }),

  showArchived: false,
  setShowArchived: (show) => set({ showArchived: show }),
}))
```

- [ ] **Step 4: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 5: コミット**

```bash
git add package.json package-lock.json src/mock/ src/store/
git commit -m "feat: add Zustand store and mock color data"
```

---

### Task 2: 共通UIコンポーネント（ColorSwatch・IconButton）

**Files:**
- Create: `src/components/color/ColorSwatch.tsx`
- Create: `src/components/ui/IconButton.tsx`

- [ ] **Step 1: src/components/color/ColorSwatch.tsx を作成する**

丸アイコン。透明度がある色はチェッカー柄の上に重ねて表現。選択中はリング表示。

```typescript
interface ColorSwatchProps {
  hex: string
  alpha?: number
  size?: 'sm' | 'md' | 'lg'
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

const SIZE_MAP = {
  sm: 'w-10 h-10',   // 40px - リストビュー
  md: 'w-14 h-14',   // 56px - ギャラリービュー
  lg: 'w-20 h-20',   // 80px - 詳細パネル
}

// HEXをRGBAに変換（チェッカーパターン表示用）
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function ColorSwatch({
  hex,
  alpha = 1.0,
  size = 'sm',
  isSelected = false,
  onClick,
  className = '',
}: ColorSwatchProps) {
  const hasTransparency = alpha < 1.0
  const rgbaColor = hexToRgba(hex, alpha)

  return (
    <button
      onClick={onClick}
      className={[
        'relative rounded-full flex-shrink-0 transition-transform',
        SIZE_MAP[size],
        onClick ? 'cursor-pointer hover:scale-105' : 'cursor-default',
        isSelected ? 'ring-2 ring-offset-2 ring-offset-surface ring-accent' : '',
        className,
      ].join(' ')}
      style={{ outline: 'none' }}
      type="button"
    >
      {/* チェッカーパターン（透明度がある場合） */}
      {hasTransparency && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #555 25%, transparent 25%),
              linear-gradient(-45deg, #555 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #555 75%),
              linear-gradient(-45deg, transparent 75%, #555 75%)
            `,
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
          }}
        />
      )}
      {/* 色レイヤー */}
      <span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: rgbaColor }}
      />
    </button>
  )
}
```

- [ ] **Step 2: src/components/ui/IconButton.tsx を作成する**

```typescript
import type { ReactNode } from 'react'

interface IconButtonProps {
  onClick?: (e: React.MouseEvent) => void
  title?: string
  disabled?: boolean
  active?: boolean
  danger?: boolean
  children: ReactNode
  className?: string
}

export function IconButton({
  onClick,
  title,
  disabled = false,
  active = false,
  danger = false,
  children,
  className = '',
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      type="button"
      className={[
        'w-7 h-7 flex items-center justify-center rounded-md transition-colors text-sm',
        disabled
          ? 'opacity-30 cursor-not-allowed text-text-muted'
          : danger
          ? 'text-text-muted hover:text-danger hover:bg-danger/10'
          : active
          ? 'text-accent bg-accent/10'
          : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 3: コミット**

```bash
git add src/components/
git commit -m "feat: add ColorSwatch and IconButton components"
```

---

### Task 3: サイドバー

**Files:**
- Create: `src/components/sidebar/SearchBar.tsx`
- Create: `src/components/sidebar/NavItem.tsx`
- Create: `src/components/sidebar/FolderList.tsx`
- Create: `src/components/sidebar/TagList.tsx`
- Create: `src/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: src/components/sidebar/SearchBar.tsx を作成する**

```typescript
interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs">
        ⌘F
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="検索"
        className="w-full pl-9 pr-3 py-1.5 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
      />
    </div>
  )
}
```

- [ ] **Step 2: src/components/sidebar/NavItem.tsx を作成する**

```typescript
import type { ReactNode } from 'react'

interface NavItemProps {
  label: string
  icon: ReactNode
  isActive?: boolean
  count?: number
  onClick: () => void
}

export function NavItem({ label, icon, isActive = false, count, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={[
        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left',
        isActive
          ? 'bg-surface-overlay text-text-primary'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay/50',
      ].join(' ')}
    >
      <span className="text-base w-4 flex-shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-text-muted tabular-nums">{count}</span>
      )}
    </button>
  )
}
```

- [ ] **Step 3: src/components/sidebar/FolderList.tsx を作成する**

```typescript
interface FolderListProps {
  activeFolderId: string | null
  onSelectFolder: (id: string) => void
}

// Step 3（CRUD実装）で Supabase からデータを取得する
// このステップではスタブのみ
export function FolderList({ activeFolderId, onSelectFolder }: FolderListProps) {
  const MOCK_FOLDERS = [
    { id: 'f1', name: 'ブランドカラー', count: 8 },
    { id: 'f2', name: 'Webプロジェクト', count: 12 },
    { id: 'f3', name: '印刷素材', count: 5 },
  ]

  return (
    <div className="space-y-0.5">
      {MOCK_FOLDERS.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onSelectFolder(folder.id)}
          type="button"
          className={[
            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left',
            activeFolderId === folder.id
              ? 'bg-surface-overlay text-text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay/50',
          ].join(' ')}
        >
          <span className="text-xs">📁</span>
          <span className="flex-1 truncate">{folder.name}</span>
          <span className="text-xs text-text-muted">{folder.count}</span>
        </button>
      ))}
      <button
        type="button"
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-secondary transition-colors text-left"
      >
        <span className="text-xs">＋</span>
        <span>フォルダを追加</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 4: src/components/sidebar/TagList.tsx を作成する**

```typescript
interface TagListProps {
  activeTagId: string | null
  onSelectTag: (id: string) => void
}

export function TagList({ activeTagId, onSelectTag }: TagListProps) {
  const MOCK_TAGS = [
    { id: 't1', name: 'ブランド' },
    { id: 't2', name: '印刷用' },
    { id: 't3', name: 'Web' },
  ]

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {MOCK_TAGS.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelectTag(tag.id)}
          type="button"
          className={[
            'px-2 py-0.5 rounded-full text-xs transition-colors',
            activeTagId === tag.id
              ? 'bg-accent text-white'
              : 'bg-surface-overlay text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: src/components/sidebar/Sidebar.tsx を作成する**

```typescript
import { useState } from 'react'
import { SearchBar } from './SearchBar'
import { NavItem } from './NavItem'
import { FolderList } from './FolderList'
import { TagList } from './TagList'
import { useUIStore } from '@/store/uiStore'
import type { NavSection } from '@/store/uiStore'

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTagId, setActiveTagId] = useState<string | null>(null)
  const { activeSection, setActiveSection, activeFolderId, setActiveFolderId } = useUIStore()

  const navItems: { id: NavSection; label: string; icon: string; count?: number }[] = [
    { id: 'all', label: 'すべての色', icon: '◉', count: 24 },
    { id: 'favorites', label: 'お気に入り', icon: '★', count: 3 },
    { id: 'history', label: '最近使った色', icon: '⏱' },
    { id: 'generator', label: 'カラージェネレーター', icon: '✦' },
  ]

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col gap-5 px-3 py-4 bg-surface border-r border-border overflow-y-auto">
      {/* 検索 */}
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {/* メインナビゲーション */}
      <nav className="space-y-0.5">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeSection === item.id && !activeFolderId}
            count={item.count}
            onClick={() => setActiveSection(item.id)}
          />
        ))}
      </nav>

      {/* フォルダ */}
      <div>
        <p className="px-2.5 mb-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">
          フォルダ
        </p>
        <FolderList
          activeFolderId={activeFolderId}
          onSelectFolder={setActiveFolderId}
        />
      </div>

      {/* タグ */}
      <div>
        <p className="px-2.5 mb-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">
          タグ
        </p>
        <TagList
          activeTagId={activeTagId}
          onSelectTag={setActiveTagId}
        />
      </div>
    </aside>
  )
}
```

- [ ] **Step 6: コミット**

```bash
git add src/components/sidebar/
git commit -m "feat: add Sidebar components"
```

---

### Task 4: リストビュー・ギャラリービュー

**Files:**
- Create: `src/components/color/ColorListItem.tsx`
- Create: `src/components/color/ColorGalleryItem.tsx`
- Create: `src/components/views/ViewToggle.tsx`
- Create: `src/components/views/FilterBar.tsx`
- Create: `src/components/views/ListView.tsx`
- Create: `src/components/views/GalleryView.tsx`

- [ ] **Step 1: src/components/color/ColorListItem.tsx を作成する**

```typescript
import { ColorSwatch } from './ColorSwatch'
import { IconButton } from '@/components/ui/IconButton'
import type { Color } from '@/types/database'

interface ColorListItemProps {
  color: Color
  isSelected: boolean
  onSelect: () => void
  onCopy: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}

export function ColorListItem({
  color,
  isSelected,
  onSelect,
  onCopy,
  onToggleFavorite,
  onDelete,
}: ColorListItemProps) {
  return (
    <div
      onClick={onSelect}
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors group',
        isSelected ? 'bg-surface-overlay' : 'hover:bg-surface-raised',
        color.is_archived ? 'opacity-40' : '',
      ].join(' ')}
    >
      {/* 丸アイコン */}
      <ColorSwatch
        hex={color.hex}
        alpha={color.alpha}
        size="sm"
        isSelected={isSelected}
      />

      {/* 色情報 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">
          {color.name || color.hex}
        </p>
        <p className="text-xs text-text-muted font-mono">{color.hex}</p>
      </div>

      {/* ロックバッジ */}
      {color.is_locked && (
        <span className="text-xs text-text-muted" title="ロック中">🔒</span>
      )}

      {/* アクションボタン（ホバー時のみ表示） */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton onClick={onCopy} title="コピー">
          ⎘
        </IconButton>
        <IconButton
          onClick={onToggleFavorite}
          title={color.is_favorite ? 'お気に入り解除' : 'お気に入り'}
          active={color.is_favorite}
        >
          {color.is_favorite ? '★' : '☆'}
        </IconButton>
        <IconButton
          onClick={onDelete}
          title="削除"
          danger
          disabled={color.is_locked}
        >
          ✕
        </IconButton>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: src/components/color/ColorGalleryItem.tsx を作成する**

```typescript
import { ColorSwatch } from './ColorSwatch'
import type { Color } from '@/types/database'

interface ColorGalleryItemProps {
  color: Color
  isSelected: boolean
  onSelect: () => void
}

export function ColorGalleryItem({ color, isSelected, onSelect }: ColorGalleryItemProps) {
  return (
    <div
      onClick={onSelect}
      className="flex flex-col items-center gap-1.5 cursor-pointer group"
      title={`${color.name}\n${color.hex}`}
    >
      <ColorSwatch
        hex={color.hex}
        alpha={color.alpha}
        size="md"
        isSelected={isSelected}
        className={color.is_archived ? 'opacity-40' : ''}
      />
      <p className="text-xs text-text-muted font-mono truncate w-14 text-center">
        {color.hex}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: src/components/views/ViewToggle.tsx を作成する**

```typescript
import type { ViewMode } from '@/store/uiStore'

interface ViewToggleProps {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-surface-overlay rounded-lg p-0.5">
      <button
        onClick={() => onChange('list')}
        type="button"
        className={[
          'px-3 py-1 rounded-md text-sm transition-colors',
          mode === 'list'
            ? 'bg-surface-raised text-text-primary shadow-sm'
            : 'text-text-muted hover:text-text-secondary',
        ].join(' ')}
      >
        リスト
      </button>
      <button
        onClick={() => onChange('gallery')}
        type="button"
        className={[
          'px-3 py-1 rounded-md text-sm transition-colors',
          mode === 'gallery'
            ? 'bg-surface-raised text-text-primary shadow-sm'
            : 'text-text-muted hover:text-text-secondary',
        ].join(' ')}
      >
        ギャラリー
      </button>
    </div>
  )
}
```

- [ ] **Step 4: src/components/views/FilterBar.tsx を作成する**

```typescript
import { useUIStore } from '@/store/uiStore'

const HUE_FILTERS = [
  { label: '赤', hex: '#ef4444' },
  { label: '橙', hex: '#f97316' },
  { label: '黄', hex: '#eab308' },
  { label: '緑', hex: '#22c55e' },
  { label: '青', hex: '#3b82f6' },
  { label: '紫', hex: '#a855f7' },
  { label: 'ピンク', hex: '#ec4899' },
  { label: '無彩色', hex: '#888888' },
]

export function FilterBar() {
  const { showArchived, setShowArchived } = useUIStore()

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border overflow-x-auto">
      {HUE_FILTERS.map((filter) => (
        <button
          key={filter.label}
          type="button"
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors flex-shrink-0"
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: filter.hex }}
          />
          {filter.label}
        </button>
      ))}

      <div className="ml-auto flex-shrink-0">
        <button
          onClick={() => setShowArchived(!showArchived)}
          type="button"
          className={[
            'px-2 py-1 rounded-full text-xs transition-colors',
            showArchived
              ? 'bg-surface-overlay text-text-primary'
              : 'text-text-muted hover:text-text-secondary',
          ].join(' ')}
        >
          アーカイブ {showArchived ? '非表示' : '表示'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: src/components/views/ListView.tsx を作成する**

```typescript
import { ColorListItem } from '@/components/color/ColorListItem'
import { useUIStore } from '@/store/uiStore'
import type { Color } from '@/types/database'

interface ListViewProps {
  colors: Color[]
}

export function ListView({ colors }: ListViewProps) {
  const { selectedColorId, setSelectedColorId, showArchived } = useUIStore()

  const visibleColors = showArchived
    ? colors
    : colors.filter((c) => !c.is_archived)

  const handleCopy = (color: Color, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(color.hex)
  }

  const handleToggleFavorite = (color: Color, e: React.MouseEvent) => {
    e.stopPropagation()
    // Step 3 で Supabase 更新に差し替え
    console.log('toggle favorite:', color.id)
  }

  const handleDelete = (color: Color, e: React.MouseEvent) => {
    e.stopPropagation()
    // Step 3 で Supabase 削除に差し替え
    console.log('delete:', color.id)
  }

  if (visibleColors.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted text-sm">色がありません</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {visibleColors.map((color) => (
        <ColorListItem
          key={color.id}
          color={color}
          isSelected={selectedColorId === color.id}
          onSelect={() => setSelectedColorId(color.id)}
          onCopy={(e) => handleCopy(color, e)}
          onToggleFavorite={(e) => handleToggleFavorite(color, e)}
          onDelete={(e) => handleDelete(color, e)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: src/components/views/GalleryView.tsx を作成する**

色相（Hue）順にソートして表示する。

```typescript
import { ColorGalleryItem } from '@/components/color/ColorGalleryItem'
import { useUIStore } from '@/store/uiStore'
import type { Color } from '@/types/database'

// HEXから色相（0-360）を計算
function getHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  if (d === 0) return 0

  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4

  return Math.round(h * 60 + (h < 0 ? 360 : 0))
}

interface GalleryViewProps {
  colors: Color[]
}

export function GalleryView({ colors }: GalleryViewProps) {
  const { selectedColorId, setSelectedColorId, showArchived } = useUIStore()

  const visibleColors = (showArchived ? colors : colors.filter((c) => !c.is_archived))
    .slice()
    .sort((a, b) => getHue(a.hex) - getHue(b.hex))

  if (visibleColors.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted text-sm">色がありません</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-wrap gap-4">
        {visibleColors.map((color) => (
          <ColorGalleryItem
            key={color.id}
            color={color}
            isSelected={selectedColorId === color.id}
            onSelect={() => setSelectedColorId(color.id)}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: コミット**

```bash
git add src/components/color/ src/components/views/
git commit -m "feat: add ListView, GalleryView, and related color components"
```

---

### Task 5: 詳細パネル

**Files:**
- Create: `src/components/detail/DetailPanel.tsx`

- [ ] **Step 1: src/components/detail/DetailPanel.tsx を作成する**

HEXからRGB・HSLを計算するユーティリティ関数を含む。

```typescript
import { useState } from 'react'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { IconButton } from '@/components/ui/IconButton'
import { useUIStore } from '@/store/uiStore'
import type { Color } from '@/types/database'

// ===== カラー変換ユーティリティ =====

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min

  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) }

  const s = d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  h = Math.round(h * 60 + (h < 0 ? 360 : 0))

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) }
}

function formatColor(color: Color, format: string): string {
  const { r, g, b } = hexToRgb(color.hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  const a = color.alpha

  switch (format) {
    case 'HEX': return color.hex
    case 'RGB': return `rgb(${r}, ${g}, ${b})`
    case 'RGBA': return `rgba(${r}, ${g}, ${b}, ${a})`
    case 'HSL': return `hsl(${h}, ${s}%, ${l}%)`
    case 'HSLA': return `hsla(${h}, ${s}%, ${l}%, ${a})`
    case 'CMYK': {
      if (color.c != null && color.m != null && color.y != null && color.k != null) {
        return `C${Math.round(color.c)} M${Math.round(color.m)} Y${Math.round(color.y)} K${Math.round(color.k)}`
      }
      return '未入力'
    }
    default: return color.hex
  }
}

// ===== コピー行 =====
function FormatRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    onCopy()
  }

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-text-muted w-10 flex-shrink-0">{label}</span>
      <span className="flex-1 text-xs text-text-secondary font-mono truncate">{value}</span>
      <button
        onClick={handleCopy}
        type="button"
        className="text-xs text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
      >
        {copied ? '✓' : '⎘'}
      </button>
    </div>
  )
}

// ===== 詳細パネル本体 =====
interface DetailPanelProps {
  color: Color | null
}

export function DetailPanel({ color }: DetailPanelProps) {
  const { setSelectedColorId, setIsDetailPanelOpen } = useUIStore()
  const [bgMode, setBgMode] = useState<'dark' | 'light'>('dark')

  const handleClose = () => {
    setSelectedColorId(null)
    setIsDetailPanelOpen(false)
  }

  if (!color) return null

  const FORMATS = ['HEX', 'RGB', 'RGBA', 'HSL', 'HSLA', 'CMYK']

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-l border-border bg-surface overflow-y-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium text-text-primary">詳細</span>
        <IconButton onClick={handleClose} title="閉じる">
          ✕
        </IconButton>
      </div>

      {/* 丸アイコン + 背景切り替え */}
      <div
        className="flex items-center justify-center py-8 relative transition-colors"
        style={{ backgroundColor: bgMode === 'dark' ? '#111' : '#f5f5f5' }}
      >
        <ColorSwatch hex={color.hex} alpha={color.alpha} size="lg" />
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button
            onClick={() => setBgMode('dark')}
            type="button"
            className={[
              'w-5 h-5 rounded-full bg-black border transition-all',
              bgMode === 'dark' ? 'border-accent scale-110' : 'border-border',
            ].join(' ')}
          />
          <button
            onClick={() => setBgMode('light')}
            type="button"
            className={[
              'w-5 h-5 rounded-full bg-white border transition-all',
              bgMode === 'light' ? 'border-accent scale-110' : 'border-border',
            ].join(' ')}
          />
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-4">
        {/* 色名 */}
        <div>
          <p className="text-base font-medium text-text-primary">{color.name || color.hex}</p>
          {color.is_locked && (
            <span className="text-xs text-text-muted">🔒 ロック中</span>
          )}
        </div>

        {/* フォーマット一覧 */}
        <div>
          <p className="text-xs text-text-muted mb-2">カラーコード</p>
          <div className="bg-surface-raised rounded-lg px-3 py-1">
            {FORMATS.map((fmt) => (
              <FormatRow
                key={fmt}
                label={fmt}
                value={formatColor(color, fmt)}
                onCopy={() => {}}
              />
            ))}
          </div>
        </div>

        {/* 透明度 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-text-muted">透明度</p>
            <p className="text-xs text-text-secondary font-mono">{Math.round(color.alpha * 100)}%</p>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(color.alpha * 100)}
            onChange={() => {}} // Step 3 で Supabase 更新に差し替え
            className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer"
          />
        </div>

        {/* CMYK */}
        {(color.c != null || color.m != null) && (
          <div>
            <p className="text-xs text-text-muted mb-1.5">CMYK（印刷用）</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(['c', 'm', 'y', 'k'] as const).map((ch) => (
                <div key={ch} className="text-center">
                  <p className="text-xs text-text-muted uppercase">{ch}</p>
                  <p className="text-sm font-mono text-text-primary">
                    {color[ch] != null ? Math.round(color[ch]!) : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 特色メモ */}
        {color.spot_color && (
          <div>
            <p className="text-xs text-text-muted mb-1">特色メモ</p>
            <p className="text-sm text-text-secondary">{color.spot_color}</p>
          </div>
        )}

        {/* 一言メモ */}
        {color.memo && (
          <div>
            <p className="text-xs text-text-muted mb-1">メモ</p>
            <p className="text-sm text-text-secondary">{color.memo}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/components/detail/
git commit -m "feat: add DetailPanel with color format conversion"
```

---

### Task 6: AppLayout と App.tsx の更新

**Files:**
- Create: `src/components/layout/AppLayout.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: src/components/layout/AppLayout.tsx を作成する**

```typescript
import { useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ListView } from '@/components/views/ListView'
import { GalleryView } from '@/components/views/GalleryView'
import { ViewToggle } from '@/components/views/ViewToggle'
import { FilterBar } from '@/components/views/FilterBar'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { useUIStore } from '@/store/uiStore'
import { MOCK_COLORS } from '@/mock/colors'

export function AppLayout() {
  const {
    viewMode,
    setViewMode,
    selectedColorId,
    isDetailPanelOpen,
    isSidebarOpen,
    setSidebarOpen,
  } = useUIStore()

  const selectedColor = MOCK_COLORS.find((c) => c.id === selectedColorId) ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-text-primary">
      {/* モバイル用オーバーレイ */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* サイドバー */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-30 transition-transform md:relative md:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar />
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* トップバー */}
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          {/* モバイル用ハンバーガー */}
          <button
            onClick={() => setSidebarOpen(true)}
            type="button"
            className="md:hidden text-text-secondary hover:text-text-primary"
          >
            ☰
          </button>

          <h1 className="text-sm font-medium text-text-primary flex-1">すべての色</h1>

          <ViewToggle mode={viewMode} onChange={setViewMode} />

          {/* 新規追加ボタン（Step 3で機能追加） */}
          <button
            type="button"
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
          >
            ＋ 追加
          </button>
        </header>

        {/* フィルターバー */}
        <FilterBar />

        {/* ビュー */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {viewMode === 'list' ? (
              <ListView colors={MOCK_COLORS} />
            ) : (
              <GalleryView colors={MOCK_COLORS} />
            )}
          </div>

          {/* 詳細パネル */}
          {isDetailPanelOpen && selectedColor && (
            <DetailPanel color={selectedColor} />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: src/App.tsx を更新する（認証後に AppLayout を表示）**

現在の `src/App.tsx` を読んでから、セッションがある場合に `<AppLayout />` を返すように修正する。

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/layout/AppLayout'
import type { Session } from '@supabase/supabase-js'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Failed to get session:', error)
      }
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  return <AppLayout />
}

function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    if (!inviteCode.trim()) {
      setError('招待コードを入力してください')
      return
    }

    setLoading(true)
    setError('')

    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('id, used_by')
      .eq('code', inviteCode.trim())
      .single()

    if (inviteError || !invitation) {
      setError('招待コードが無効です')
      setLoading(false)
      return
    }

    if (invitation.used_by) {
      setError('この招待コードはすでに使用されています')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          state: inviteCode.trim(),
        },
      },
    })

    if (authError) {
      setError('ログインに失敗しました。もう一度お試しください。')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-surface">
      <div className="w-full max-w-sm p-8 bg-surface-raised border border-border rounded-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent rounded-xl mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-text-primary">ColorPicker</h1>
          <p className="text-sm text-text-secondary mt-1">Beta版 · 招待制</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">招待コード</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="招待コードを入力"
              className="w-full px-3 py-2 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full px-4 py-2.5 bg-white text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>処理中...</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google でログイン
              </>
            )}
          </button>

          <p className="text-xs text-text-muted text-center">
            本アプリはBeta版です。再配布は禁止されています。
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 型チェックを通す**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 4: 開発サーバーで動作確認する**

```bash
npm run dev:vite
```

http://localhost:5173 でログイン後、以下を確認：
- サイドバーが左に表示されている
- メインエリアにリストビューでモック色が表示されている
- 色をクリックすると右に詳細パネルが開く
- 「ギャラリー」タブに切り替えると丸アイコングリッドに変わる
- ウィンドウ幅を768px未満にするとサイドバーが非表示になりハンバーガーアイコンが出る

- [ ] **Step 5: コミット**

```bash
git add src/App.tsx src/components/layout/
git commit -m "feat: add AppLayout and wire up main UI shell"
```

---

## セルフレビュー

**仕様カバレッジ確認：**
- [x] サイドバー：検索バー・すべての色・お気に入り・最近使った色・フォルダ一覧・タグ一覧・カラージェネレーター
- [x] メインエリア：ビュー切り替えタブ（リスト/ギャラリー）
- [x] フィルターバー：系統別（色相ボタン）・アーカイブ表示切り替え
- [x] リストビュー：丸アイコン・名前・HEX・コピー・削除・ロック・★
- [x] ギャラリービュー：丸アイコングリッド・色相順ソート
- [x] 詳細パネル：丸アイコン大・白/黒背景切り替え・各フォーマット表示＋コピー・透明度スライダー・CMYK・特色メモ・一言メモ
- [x] 丸アイコン：透明度チェッカー柄・選択リング・サイズ3種（40px/56px/80px）
- [x] モバイル：768px未満でサイドバーをハンバーガーメニューに格納
- [x] ダークモード専用（Tailwindカスタムトークン使用）

**未実装（後続ステップ）：**
- ピッカーオーバーレイ（Step 5）
- タグフィルター横断（Step 7）
- アーカイブ非表示フィルター（フィルターバーボタンのみ・Step 4で機能追加）
- 詳細パネルのコントラストチェッカー（Step 10）
