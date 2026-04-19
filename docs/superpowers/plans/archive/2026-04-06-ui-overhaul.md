# UI全刷新 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** カラーピッカーアプリのUI全刷新。ダーク・ライト両モード対応、ブランドカラー #0a3ed8 + #00ceff のグロー適用、余白拡張。

**Architecture:** CSS変数をテーマトークンとして `index.css` に定義し、Tailwindの全カラーをその変数参照に書き換える。`uiStore` にテーマ状態を追加し、`<html data-theme>` 属性切り替えでテーマを適用する。既存の Tailwind クラス名（`bg-surface`、`text-text-primary` 等）はそのまま維持し、変数の値のみ変える。

**Tech Stack:** React, TypeScript, Tailwind CSS v3, Zustand, Vite

**Spec:** `docs/superpowers/specs/2026-04-06-ui-overhaul-design.md`

---

## ファイル変更マップ

| ファイル | 変更内容 |
|---|---|
| `src/index.css` | CSS変数定義（dark/light両モード）・グローユーティリティクラス追加 |
| `tailwind.config.ts` | 全カラーをCSS変数参照（rgb pattern）に変更・新トークン追加 |
| `src/store/uiStore.ts` | `theme` 状態・`setTheme` アクション追加 |
| `src/components/layout/AppLayout.tsx` | テーマ適用 effect・ヘッダー余白・テーマトグルボタン追加 |
| `src/components/sidebar/Sidebar.tsx` | サイドバー背景・ボーダー・幅・余白更新 |
| `src/components/sidebar/NavItem.tsx` | アクティブ状態スタイル（bg-accent + glow）・余白更新 |
| `src/components/views/FilterBar.tsx` | アクティブフィルター glow・余白更新 |
| `src/components/color/ColorListItem.tsx` | 行余白・選択状態ボーダー・スウォッチ選択リング更新 |
| `src/components/color/ColorGalleryItem.tsx` | スウォッチ選択リング更新 |
| `src/components/sidebar/SearchBar.tsx` | ボーダー・フォーカス色更新 |
| `src/store/uiTestStore.ts` | CSS変数名を `--color-accent` 系に更新 |

---

## Task 1: CSS Variables + Tailwind Config

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.ts`

---

- [ ] **Step 1: index.css を書き換える**

`src/index.css` を以下に完全置換する：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── テーマトークン（Dark = デフォルト） ── */
:root {
  --color-surface:          8 9 15;        /* #08090f */
  --color-surface-raised:   12 13 20;      /* #0c0d14 */
  --color-surface-overlay:  22 24 33;      /* #161821 */
  --color-surface-sidebar:  12 13 20;      /* #0c0d14 */
  --color-border:           26 27 36;      /* #1a1b24 */
  --color-border-subtle:    18 19 26;      /* #12131a */
  --color-border-sidebar:   26 27 36;      /* #1a1b24 */
  --color-text-primary:     255 255 255;   /* #ffffff */
  --color-text-secondary:   46 48 66;      /* #2e3042 */
  --color-text-muted:       34 36 54;      /* #222436 */
  --color-accent:           10 62 216;     /* #0a3ed8 */
  --color-accent-hover:     8 50 184;      /* #0832b8 */
  --color-accent-soft:      122 160 255;   /* #7aa0ff  ダーク背景でのアクセント文字色 */
  --color-accent-ring:      0 206 255;     /* #00ceff  選択リングのみ */
}

/* ── Light Mode ── */
[data-theme="light"] {
  --color-surface:          245 247 250;   /* #f5f7fa */
  --color-surface-raised:   240 242 245;   /* #f0f2f5 */
  --color-surface-overlay:  232 235 242;   /* #e8ebf2 */
  --color-surface-sidebar:  234 237 242;   /* #eaedf2 */
  --color-border:           235 235 235;   /* #ebebeb */
  --color-border-subtle:    240 240 240;   /* #f0f0f0 */
  --color-border-sidebar:   216 220 232;   /* #d8dce8 */
  --color-text-primary:     13 13 13;      /* #0d0d0d */
  --color-text-secondary:   154 160 178;   /* #9aa0b2 */
  --color-text-muted:       192 196 208;   /* #c0c4d0 */
  --color-accent:           10 62 216;     /* #0a3ed8 */
  --color-accent-hover:     8 50 184;      /* #0832b8 */
  --color-accent-soft:      10 62 216;     /* #0a3ed8  ライトでは同じ */
  --color-accent-ring:      0 206 255;     /* #00ceff */
}

/* ── グローユーティリティ ── */
/* ナビ アクティブ */
.glow-accent {
  box-shadow: 0 0 14px rgba(10,62,216,.55), 0 2px 8px rgba(10,62,216,.3);
}
[data-theme="light"] .glow-accent {
  box-shadow: 0 0 12px rgba(10,62,216,.35), 0 2px 6px rgba(10,62,216,.2);
}
/* フィルター アクティブ */
.glow-accent-sm {
  box-shadow: 0 0 10px rgba(10,62,216,.25);
}
[data-theme="light"] .glow-accent-sm {
  box-shadow: 0 0 8px rgba(10,62,216,.2);
}
/* ＋追加ボタン */
.glow-accent-btn {
  box-shadow: 0 0 16px rgba(10,62,216,.5), 0 2px 8px rgba(10,62,216,.25);
}
[data-theme="light"] .glow-accent-btn {
  box-shadow: 0 0 14px rgba(10,62,216,.4), 0 2px 6px rgba(10,62,216,.2);
}
/* 選択色スウォッチ リング（スウォッチ自体には適用しない・親要素に適用） */
.ring-selection {
  box-shadow: 0 0 0 2px rgb(var(--color-surface)), 0 0 0 3.5px rgb(var(--color-accent-ring)), 0 0 8px rgba(0,206,255,.45);
}
[data-theme="light"] .ring-selection {
  box-shadow: 0 0 0 2px rgb(var(--color-surface)), 0 0 0 3.5px rgb(var(--color-accent-ring)), 0 0 8px rgba(0,206,255,.35);
}

/* ── iPhone ノッチ・ホームバー対応 ── */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
.pt-safe {
  padding-top: env(safe-area-inset-top);
}

@layer base {
  * {
    box-sizing: border-box;
  }
  body {
    @apply bg-surface text-text-primary font-sans;
    margin: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { @apply bg-surface; }
  ::-webkit-scrollbar-thumb { @apply bg-border rounded-full; }
}
```

- [ ] **Step 2: tailwind.config.ts を書き換える**

`tailwind.config.ts` を以下に完全置換する：

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          raised:   'rgb(var(--color-surface-raised) / <alpha-value>)',
          overlay:  'rgb(var(--color-surface-overlay) / <alpha-value>)',
          sidebar:  'rgb(var(--color-surface-sidebar) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          subtle:  'rgb(var(--color-border-subtle) / <alpha-value>)',
          sidebar: 'rgb(var(--color-border-sidebar) / <alpha-value>)',
        },
        text: {
          primary:   'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          muted:     'rgb(var(--color-text-muted) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover:   'rgb(var(--color-accent-hover) / <alpha-value>)',
          soft:    'rgb(var(--color-accent-soft) / <alpha-value>)',
          ring:    'rgb(var(--color-accent-ring) / <alpha-value>)',
        },
        danger:  '#ef4444',
        warning: '#f59e0b',
        success: '#22c55e',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 3: ビルドエラーがないことを確認する**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker
npm run type-check
```

エラーなしで完了することを確認する。

- [ ] **Step 4: 開発サーバーでダークモードが正常表示されることを確認する**

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開く。
確認事項：
- アプリが表示される（クラッシュしない）
- 背景色が以前と同様に暗い（CSS変数が正しく読み込まれている）
- テキストが表示される

- [ ] **Step 5: コミット**

```bash
git add src/index.css tailwind.config.ts
git commit -m "refactor: migrate color tokens to CSS variables for light/dark theme support"
```

---

## Task 2: テーマストア + テーマ適用

**Files:**
- Modify: `src/store/uiStore.ts`
- Modify: `src/components/layout/AppLayout.tsx`

---

- [ ] **Step 1: uiStore.ts を読む**

`src/store/uiStore.ts` を読んでストアの現在の状態定義を把握する。

- [ ] **Step 2: uiStore.ts に theme 状態を追加する**

以下を uiStore の state インターフェースに追加する（既存の状態は変更しない）：

```ts
// State に追加
theme: 'dark' | 'light' | 'system'

// Actions に追加
setTheme: (theme: 'dark' | 'light' | 'system') => void
```

Zustand の create() 内の初期値に追加：

```ts
theme: 'dark',
```

setTheme アクションの実装：

```ts
setTheme: (theme) => set({ theme }),
```

- [ ] **Step 3: AppLayout.tsx にテーマ適用 effect を追加する**

`src/components/layout/AppLayout.tsx` を読む。

useUIStore から `theme` と `setTheme` を取得し、以下の effect を追加する：

```ts
const { theme, setTheme, /* 既存の変数 */ } = useUIStore()

// テーマを <html> の data-theme 属性に適用
useEffect(() => {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    // システム設定変更を監視
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      root.setAttribute('data-theme', e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  } else {
    root.setAttribute('data-theme', theme)
  }
}, [theme])
```

- [ ] **Step 4: AppLayout.tsx にテーマトグルボタンを追加する**

ヘッダーの `⋯` メニューボタンの隣にテーマトグルボタンを追加する。
Icons.tsx に既存のアイコンがあれば使う。なければインライン SVG を使う。

ヘッダー内のボタン群に追加：

```tsx
{/* テーマトグル */}
<button
  type="button"
  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors"
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
```

- [ ] **Step 5: ヘッダーの余白を更新する**

AppLayout.tsx のヘッダー `<header>` タグの className を以下に変更する：

```
// 変更前
className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0"

// 変更後
className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0"
```

- [ ] **Step 6: ＋追加ボタンに glow-accent-btn を追加する**

AppLayout.tsx 内の「＋ 追加」ボタンを更新する：

```tsx
// 変更前
className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"

// 変更後
className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-full transition-all glow-accent-btn"
```

- [ ] **Step 7: 動作確認**

`npm run dev` でブラウザを開く。
- ヘッダーにトグルボタンが表示される
- クリックするとライト / ダーク が切り替わる
- ライトモードでアプリ全体が明るくなる
- ＋追加ボタンにグローが見える

- [ ] **Step 8: コミット**

```bash
git add src/store/uiStore.ts src/components/layout/AppLayout.tsx
git commit -m "feat: add light/dark theme toggle with CSS variable switching"
```

---

## Task 3: Sidebar + NavItem

**Files:**
- Modify: `src/components/sidebar/Sidebar.tsx`
- Modify: `src/components/sidebar/NavItem.tsx`

---

- [ ] **Step 1: Sidebar.tsx を読む**

`src/components/sidebar/Sidebar.tsx` を読んでサイドバーのルート要素の className を把握する。

- [ ] **Step 2: Sidebar.tsx のサイドバー外枠を更新する**

Sidebar のルート div の className を変更する：

```
// 変更前（おおよそ）
className="flex flex-col w-56 bg-surface border-r border-border ..."

// 変更後
className="flex flex-col w-[152px] bg-surface-sidebar border-r border-border-sidebar ..."
```

`w-56`（224px）→ `w-[152px]`、`bg-surface` → `bg-surface-sidebar`、`border-border` → `border-border-sidebar` に変更する。

- [ ] **Step 3: Sidebar.tsx のセクション見出し余白を更新する**

セクション見出し（「フォルダ」「タグ」等のラベル）の `px-2.5 mb-1.5` を `px-3 mb-2` に変更する。

- [ ] **Step 4: NavItem.tsx を読む**

`src/components/sidebar/NavItem.tsx` を読んでボタン要素の className を把握する。

- [ ] **Step 5: NavItem.tsx のスタイルを更新する**

ナビアイテムのボタン className を以下に変更する：

```ts
// 変更前
isActive
  ? 'bg-surface-overlay text-text-primary'
  : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay/50'

// 変更後
isActive
  ? 'bg-accent text-white glow-accent'
  : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay/50'
```

ベースの className（全状態共通）の padding を変更する：

```
// 変更前
'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg ...'

// 変更後
'flex items-center gap-2.5 px-2.5 py-2 rounded-lg ...'
```

- [ ] **Step 6: 動作確認**

ブラウザでサイドバーを確認する：
- サイドバーが152pxに縮んでいる
- アクティブなナビ項目が青いボタン状になりグローがある
- ライトモードでサイドバーが #eaedf2 になっている

- [ ] **Step 7: コミット**

```bash
git add src/components/sidebar/Sidebar.tsx src/components/sidebar/NavItem.tsx
git commit -m "style: update sidebar width, background, and nav item active glow"
```

---

## Task 4: FilterBar

**Files:**
- Modify: `src/components/views/FilterBar.tsx`

---

- [ ] **Step 1: FilterBar.tsx を読む**

`src/components/views/FilterBar.tsx` を読んで、フィルターピルのボタン className と padding を把握する。

- [ ] **Step 2: フィルターバーの外側 padding を更新する**

フィルターバーの外枠 div の className を変更する：

```
// 変更前
className="... gap-2 px-4 py-2"

// 変更後
className="... gap-2 px-4 py-2.5"
```

- [ ] **Step 3: フィルターピルのアクティブスタイルを更新する**

各フィルターピルの isActive 時の className を変更する。

色相フィルター（赤・橙・黄・緑・青 etc.）のテキストフィルターピル：

```ts
// 変更前
isActive
  ? 'bg-surface-overlay text-text-primary ring-1 ring-border'
  : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay'

// 変更後
isActive
  ? 'bg-accent/10 text-accent-soft border border-accent glow-accent-sm font-medium'
  : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay border border-transparent'
```

ソートボタン・その他のピルにも同じパターンを適用する（ファイル内で `isActive` または `active` が使われているすべての箇所）。

- [ ] **Step 4: 動作確認**

ブラウザでフィルターバーを確認する：
- フィルタークリックで青いボーダー + 薄い青背景 + グローが出る
- ライトモードで青テキスト、ダークモードで明るい青テキスト

- [ ] **Step 5: コミット**

```bash
git add src/components/views/FilterBar.tsx
git commit -m "style: update filter bar active pill with glow and accent border"
```

---

## Task 5: ColorListItem + ColorGalleryItem（選択リング・余白）

**Files:**
- Modify: `src/components/color/ColorListItem.tsx`
- Modify: `src/components/color/ColorGalleryItem.tsx`

---

- [ ] **Step 1: ColorListItem.tsx を読む**

`src/components/color/ColorListItem.tsx` を読んでリスト行の className・スウォッチ要素を把握する。

- [ ] **Step 2: ColorListItem.tsx の行余白を更新する**

行全体の div の className を更新する：

```
// 変更前
className="... gap-3 px-3 py-2"

// 変更後
className="... gap-3 px-3 py-2.5"
```

- [ ] **Step 3: ColorListItem.tsx の選択状態スタイルを更新する**

isSelected 時の背景スタイルを変更する：

```ts
// 変更前
isSelected ? 'bg-surface-overlay' : 'hover:bg-surface-raised'

// 変更後
isSelected
  ? 'bg-surface-raised border border-border'
  : 'border border-transparent hover:bg-surface-raised'
```

- [ ] **Step 4: ColorListItem.tsx のスウォッチに選択リングを追加する**

カラースウォッチを表示している要素（`ColorSwatch` または直接 div）に isSelected 時の className を追加する：

```tsx
// スウォッチ要素（おおよそ）
<div
  className={[
    'w-8 h-8 rounded-full flex-shrink-0',
    isSelected ? 'ring-selection' : '',
  ].join(' ')}
  style={{ backgroundColor: `rgba(${r},${g},${b},${color.alpha})` }}
/>
```

スウォッチの実装が `ColorSwatch` コンポーネントを使っている場合は、`ColorSwatch.tsx` を読んで `className` prop があるか確認し、あればそこに渡す。

- [ ] **Step 5: ColorGalleryItem.tsx を読む**

`src/components/color/ColorGalleryItem.tsx` を読んでスウォッチ要素を把握する。

- [ ] **Step 6: ColorGalleryItem.tsx のスウォッチに選択リングを追加する**

isSelected 時に `ring-selection` を追加する（Step 4 と同パターン）。

- [ ] **Step 7: 動作確認**

ブラウザでリストビューとギャラリービューを確認する：
- 色をクリックすると選択リング（シアン）が光る
- 選択行が薄いボーダー付きで強調される
- 行の高さが少し広がっている

- [ ] **Step 8: コミット**

```bash
git add src/components/color/ColorListItem.tsx src/components/color/ColorGalleryItem.tsx
git commit -m "style: add selection ring glow and increase list row spacing"
```

---

## Task 6: SearchBar + 残りコンポーネント

**Files:**
- Modify: `src/components/sidebar/SearchBar.tsx`
- Modify: `src/store/uiTestStore.ts`

---

- [ ] **Step 1: SearchBar.tsx を読む**

`src/components/sidebar/SearchBar.tsx` を読んでインプット要素の className を把握する。

- [ ] **Step 2: SearchBar.tsx のフォーカスカラーを更新する**

インプットの `focus:border-accent` や `focus:ring` が使われていれば確認し、問題なければそのままでよい（accent トークンは変わらず #0a3ed8）。
`border-border` が使われていれば `border-border` のままでよい（CSS変数化済み）。

- [ ] **Step 3: uiTestStore.ts を読む**

`src/store/uiTestStore.ts` を読んで、CSS変数への参照（`--accent`、`--accent-hover`）を探す。

- [ ] **Step 4: uiTestStore.ts の変数名を更新する**

`--accent` → `--color-accent`、`--accent-hover` → `--color-accent-hover` に変更する。

変数値の形式も合わせて変更する（旧形式は `R G B` スペース区切り整数、新形式も同じ形式なので値はそのまま使用可能。ただし新しい変数名に合わせる）。

例：
```ts
// 変更前
document.documentElement.style.setProperty('--accent', '59 130 246')
document.documentElement.style.setProperty('--accent-hover', '37 99 235')

// 変更後
document.documentElement.style.setProperty('--color-accent', '59 130 246')
document.documentElement.style.setProperty('--color-accent-hover', '37 99 235')
```

（値は既存のまま変えない。UIテストモードが独自カラーを設定する仕様はそのまま維持する）

- [ ] **Step 5: 全体の最終確認**

```bash
npm run type-check
```

エラーがないことを確認する。

ブラウザで以下を確認する：
1. ダークモード：背景 #08090f（暗い青みがかった黒）・サイドバー若干明るい
2. ライトモード：背景 #f5f7fa・サイドバー #eaedf2・白のメインエリア
3. ＋追加ボタン：青いグロー
4. ナビアクティブ：青ボタン + グロー
5. フィルターアクティブ：青ボーダー + 薄い青背景 + グロー
6. 選択色：シアンのリング
7. テーマトグル：ヘッダーのアイコンで切り替わる

- [ ] **Step 6: コミット**

```bash
git add src/components/sidebar/SearchBar.tsx src/store/uiTestStore.ts
git commit -m "style: update remaining components for theme compatibility"
```

---

## 完了後の確認コマンド

```bash
# TypeScript エラーなし
npm run type-check

# ビルドが通る
npm run build:vite
```

---

## 注意事項

- **DetailPanel の `#111` / `#f5f5f5`**：これはカラープレビューの背景（白地・黒地での色の見え方を確認する機能）。テーマカラーではないため変更不要。
- **FilterBar の色相フィルタードット**（赤・橙・黄等の HEX 値）：実際の色を表すためハードコードのまま維持。
- **`border border-transparent`** を追加している箇所：レイアウトシフト防止のため（選択時の `border border-border` と高さを揃える）。
