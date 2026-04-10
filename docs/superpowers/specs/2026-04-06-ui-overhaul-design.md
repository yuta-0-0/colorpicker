# UI全刷新 デザイン仕様書

## 概要

カラーピッカーアプリのUI全刷新。ダーク・ライト両モード対応。
デザイン哲学は「整えること」— 色そのものが主役になるよう、UIは徹底的に控えめに。

**参照サイト:** https://graphic-design.blue/（ゆうた氏のサイト）
**参照デザインシステム:** Figma Dark（ベース） + Notion タイポグラフィ精度

---

## 1. カラートークン

### Dark Mode

| トークン | 値 | 用途 |
|---|---|---|
| `surface` | `#08090f` | メイン背景 |
| `surface-raised` | `#0c0d14` | サイドバー・選択行背景 |
| `border` | `#1a1b24` | ボーダー全般 |
| `text-primary` | `#ffffff` | 主要テキスト |
| `text-secondary` | `#2e3042` | サブテキスト・ナビ非アクティブ |
| `text-muted` | `#222436` | 薄いテキスト・HEX表示 |

### Light Mode

| トークン | 値 | 用途 |
|---|---|---|
| `surface` | `#f5f7fa` | メイン背景 |
| `surface-raised` | `#f0f2f5` | 選択行背景・ホバー背景 |
| `surface-sidebar` | `#eaedf2` | サイドバー背景 |
| `border` | `#ebebeb` | ヘッダー・フィルターバーボーダー |
| `border-sidebar` | `#d8dce8` | サイドバーボーダー |
| `text-primary` | `#0d0d0d` | 主要テキスト |
| `text-secondary` | `#9aa0b2` | サブテキスト・ナビ非アクティブ |
| `text-muted` | `#c0c4d0` | HEXコード・タイムスタンプ等 |

### 共通アクセント

| トークン | 値 | 用途 |
|---|---|---|
| `accent` | `#0a3ed8` | CTA・ナビアクティブ・フィルターアクティブ |
| `accent-ring` | `#00ceff` | **選択色スウォッチのリングのみ** |

---

## 2. グロー効果

アクセントカラーが使われているUI要素に控えめなグローを統一適用。
**カラースウォッチ（丸アイコン）自体には適用しない。**

| 要素 | Dark | Light |
|---|---|---|
| ナビ アクティブ | `0 0 14px rgba(10,62,216,.55), 0 2px 8px rgba(10,62,216,.3)` | `0 0 12px rgba(10,62,216,.35), 0 2px 6px rgba(10,62,216,.2)` |
| ＋追加ボタン | `0 0 16px rgba(10,62,216,.5), 0 2px 8px rgba(10,62,216,.25)` | `0 0 14px rgba(10,62,216,.4), 0 2px 6px rgba(10,62,216,.2)` |
| フィルター アクティブ | `0 0 10px rgba(10,62,216,.25)` | `0 0 8px rgba(10,62,216,.2)` |
| 選択リング | `0 0 0 2px #08090f, 0 0 0 3.5px #00ceff, 0 0 8px rgba(0,206,255,.45)` | `0 0 0 2px #f5f7fa, 0 0 0 3.5px #00ceff, 0 0 8px rgba(0,206,255,.35)` |

---

## 3. タイポグラフィ

**フォント:** `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`
（Mac: SF Pro / iPhone: San Francisco）

| 要素 | サイズ | ウェイト | letter-spacing |
|---|---|---|---|
| セクションタイトル | 11px | 600 | -0.3px |
| ナビ アクティブ | 9px | 600 | -0.2px |
| ナビ 通常 | 9px | 400 | -0.1px |
| リスト 色名 | 9px | 500 | -0.2px |
| HEX コード | 8px | 400 | 0（mono） |
| ボタン | 8px | 600 | -0.1px |
| フィルターラベル | 8px | 400〜600 | 0 |
| ブランド名 | 9px | 700 | -0.2px |

モノスペースフォント（HEXコード）: `'SF Mono', 'Menlo', monospace`

---

## 4. スペーシング

| 要素 | 値 |
|---|---|
| ヘッダー padding | `11px 14px` |
| フィルターバー padding | `8px 14px` |
| サイドバー padding | `16px 10px` |
| ナビ行 padding | `8px 10px` |
| ナビ行 gap | `4px` |
| リスト padding | `10px` |
| リスト行 padding | `9px 10px` |
| リスト行 gap | `4px` |
| セクション divider margin | `6px` |

---

## 5. ボーダー半径

| 要素 | 値 |
|---|---|
| ナビ行・リスト行・カード | `7–8px` |
| ボタン・バッジ・フィルターピル | `9999px`（ピル型） |
| アプリコンテナ | `12px` |
| モーダル | `12px` |

---

## 6. コンポーネント仕様

### サイドバー
- 幅: 152px（固定）
- Dark: `#0c0d14` / `border-right: 1px solid #1a1b24`
- Light: `#eaedf2` / `border-right: 1px solid #d8dce8`
- ブランドロゴ: 9px font-weight 700

### ナビゲーション項目
- アクティブ: `background: #0a3ed8` + グロー + ピル型角丸 7px
- 通常: 背景なし・`text-secondary` カラー
- ホバー: `text-primary` カラーに移行（transition 150ms）

### ヘッダー
- `border-bottom: 1px solid {border}`
- タイトル: 11px font-weight 600 letter-spacing -0.3px
- ＋追加ボタン: `#0a3ed8` ピル型 + グロー

### フィルターバー
- `border-bottom: 1px solid {border}`
- 通常ピル: `border: 1px solid {border}` / `color: text-secondary`
- アクティブピル: `color: #0a3ed8` / `background: rgba(10,62,216,.08)` / `border: 1px solid #0a3ed8` + グロー
- Darkアクティブ: `color: #7aa0ff`（視認性確保のためライト側より明るく）

### リスト行
- 通常: 背景なし・ボーダーなし
- 選択: `border: 1px solid {border}` + `background: {surface-raised}`
- スウォッチ: 22px 丸 `border-radius: 50%`
- 選択スウォッチ: `#00ceff` リング + グロー（スウォッチ自体のスタイルはそのまま）

---

## 7. テーマ切り替え実装方針

CSS変数ベースで管理。`<html>` の `data-theme="light"` / `data-theme="dark"` で切り替え。

```css
:root[data-theme="dark"] {
  --surface: #08090f;
  --surface-raised: #0c0d14;
  --border: #1a1b24;
  --text-primary: #ffffff;
  --text-secondary: #2e3042;
  --text-muted: #222436;
}

:root[data-theme="light"] {
  --surface: #f5f7fa;
  --surface-raised: #f6f7fa;
  --surface-sidebar: #eaedf2;
  --border: #ebebeb;
  --border-sidebar: #d8dce8;
  --text-primary: #0d0d0d;
  --text-secondary: #9aa0b2;
  --text-muted: #c0c4d0;
}

/* 共通 */
:root {
  --accent: #0a3ed8;
  --accent-ring: #00ceff;
}
```

`tailwind.config.ts` の全カラーを CSS変数参照に書き換える。既存の Tailwind クラス（`bg-surface`, `text-text-primary` 等）はそのまま維持し、値のみ変数に移行する。

デフォルト: ダークモード（既存動作を維持）
ユーザー設定で切り替え可能にする（uiStore に `theme: 'dark' | 'light' | 'system'` を追加）。

---

## 8. 実装対象ファイル

### トークン変更（全体影響）
- `tailwind.config.ts` — カラー定義を CSS変数参照に移行
- `src/index.css` — CSS変数定義を追加・テーマ切り替えロジック

### ストア
- `src/store/uiStore.ts` — `theme` 状態追加・`toggleTheme` アクション

### コンポーネント（スタイル更新）
- `src/components/layout/AppLayout.tsx`
- `src/components/sidebar/Sidebar.tsx`
- `src/components/sidebar/NavItem.tsx`
- `src/components/sidebar/SearchBar.tsx`
- `src/components/views/FilterBar.tsx`
- `src/components/views/ListView.tsx`
- `src/components/views/GalleryView.tsx`
- `src/components/views/ViewToggle.tsx`
- `src/components/color/ColorListItem.tsx`
- `src/components/color/ColorGalleryItem.tsx`
- `src/components/detail/DetailPanel.tsx`
- `src/components/ui/IconButton.tsx`
- `src/components/ui/BulkActionBar.tsx`
- `src/components/ui/Toast.tsx`
- モーダル類（AddColorModal, ImagePickerModal 等）

---

## 決定事項ログ

| 項目 | 決定値 | 理由 |
|---|---|---|
| デザインベース | Figma Dark + Notion タイポ | ストイック×丁寧 |
| モード | ライト・ダーク両対応 | ユーザー要望 |
| アクセント | #0a3ed8 主役・#00ceff は選択リングのみ | 役割明確化 |
| ライト背景 | #f5f7fa | 色の見え方を最優先 |
| サイドバー | #eaedf2 | ブランドサイトと一致・ニュートラル |
| ダーク背景 | #08090f（青みかすか） | 深みと方向性 |
| フォント | システムフォント SF Pro | ネイティブ感・高速 |
| グロー | アクセント要素全般・スウォッチ除外 | 統一感・過剰にならない |
