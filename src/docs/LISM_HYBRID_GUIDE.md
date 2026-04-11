# Lism CSS ハイブリッド設計ガイド

このアプリは **React + Tailwind CSS** をベースに、**Lism CSS の設計思想** を部分的に取り込んだ「ハイブリッド型」アーキテクチャを採用しています。

---

## 1. 余白ステップシステム

`src/styles/spacing.css` で定義した CSS Variables を使用します。

| 変数         | 値       | Tailwindクラス | 用途                     |
|-------------|---------|---------------|------------------------|
| `--space-1`  | 4px     | `gap-1`, `p-1`  | アイコンと文字の隙間など極小余白 |
| `--space-2`  | 8px     | `gap-2`, `p-2`  | ボタン内パディング、小要素間 |
| `--space-3`  | 12px    | `gap-3`, `p-3`  | リスト行の内側パディング   |
| `--space-4`  | 16px    | `gap-4`, `p-4`  | セクション間の標準余白     |
| `--space-6`  | 24px    | `gap-6`, `p-6`  | パネル内余白              |
| `--space-8`  | 32px    | `gap-8`, `p-8`  | セクション間の大きな余白   |
| `--space-12` | 48px    | `gap-12`        | ページレベルの余白        |

**ルール：** 上記スケール外の中途半端な値（例: `gap-5`, `p-7`）は原則使わない。

---

## 2. レイアウトプリミティブ

`src/components/primitives/` 以下の4コンポーネントを使います。

### Stack（縦積み）

子要素を縦方向に並べるとき。

```tsx
import { Stack } from '@/components/primitives'

// 使用例: フォーム、詳細パネル内のセクション
<Stack gap="4">
  <Label />
  <Input />
  <HelpText />
</Stack>
```

**いつ使う:** 縦方向の `flex flex-col gap-*` を書いていたら Stack に置き換える。

---

### Cluster（並列グループ）

子要素を横方向に並べ、折り返しOKのとき。

```tsx
import { Cluster } from '@/components/primitives'

// 使用例: タグ一覧、ボタングループ、アイコン+テキスト
<Cluster gap="2" align="center">
  <Icon />
  <Label />
</Cluster>
```

**いつ使う:** `flex flex-wrap gap-* items-center` を書いていたら Cluster に置き換える。  
折り返し不要のときは `wrap={false}` を渡す。

---

### Center（中央配置）

コンテンツを水平・垂直中央に配置するとき。

```tsx
import { Center } from '@/components/primitives'

// 使用例: 空状態、ローディング表示
<Center full>
  <EmptyState />
</Center>
```

**いつ使う:** `flex items-center justify-center` を書いていたら Center に置き換える。  
`full` prop を渡すと `flex-1 h-full` が付加されて親要素を埋める。

---

### SidebarLayout（サイドバー付きレイアウト）

固定幅のサイド列 + 伸縮するメイン列のとき。

```tsx
import { SidebarLayout } from '@/components/primitives'

// 使用例: アプリシェル、詳細パネル付きビュー
<SidebarLayout
  side={<Sidebar />}
  main={<MainContent />}
/>
```

**いつ使う:** `flex` + `flex-shrink-0`（サイド）+ `flex-1`（メイン）の組み合わせを書いていたら置き換える。

---

## 3. 構造と装飾の分離

コンポーネントを書くときは、以下の2層に分けて考える。

| 層         | 責任                                     | 使うもの                        |
|-----------|------------------------------------------|---------------------------------|
| **構造層** | 配置・間隔・サイズ・コンテナ             | Stack / Cluster / Center / SidebarLayout |
| **装飾層** | 色・タイポグラフィ・ボーダー・シャドウ   | Tailwindのカラークラス / CSS Variables |

**悪い例（混在）:**
```tsx
<div className="flex flex-col gap-4 bg-surface-raised rounded-xl p-4 border border-border">
```

**良い例（分離）:**
```tsx
<Stack gap="4" className="bg-surface-raised rounded-xl p-4 border border-border">
```

構造（`flex flex-col gap-4`）はプリミティブに、装飾（背景・角丸・ボーダー）はclassNameで追加する。

---

## 4. 新コンポーネントを追加するときのチェックリスト

1. **配置はどうか?** → Stack / Cluster / Center / SidebarLayout を検討
2. **余白は規則内か?** → `--space-*` スケールを使っているか確認
3. **構造と装飾が混在していないか?** → プリミティブに構造を任せる
4. **既存の似たコンポーネントはないか?** → `src/components/primitives/` を確認

---

## 5. 適用済みコンポーネント一覧

| コンポーネント             | 適用内容                    |
|--------------------------|---------------------------|
| `ListView`               | 空状態 → `<Center full>`  |
| `GalleryView`            | 空状態 → `<Center full>`  |
| `TrashView`              | ローディング・空状態 → `<Center full>` + `<Stack>` |
| `AppLayout`              | ローディング → `<Center full>` |
| `Sidebar`                | 履歴カラーチップ → `<Cluster gap="1">` |
| `GeneratorView`          | 空状態 → `<Center>` |
