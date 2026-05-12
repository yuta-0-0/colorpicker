# Step 7: タグ・特色メモ・検索・絞り込み 設計仕様

## スコープ

- タグ CRUD（新規作成・削除）+ 色へのタグ付け / 外し
- 特色メモ（spot_color）の詳細パネルでのインライン編集
- 一言メモ（memo）: 実装済みのため変更なし
- テキスト検索：色名 / HEX / memo / spot_color / タグ名
- 絞り込み：タグフィルター・使用頻度ソート

---

## 状態管理

### tagStore.ts（新規）

```ts
tags: Tag[]
colorTags: Record<string, Tag[]>   // colorId → Tag[] のマップ
loading: boolean

fetchTags(): Promise<void>
createTag(name: string): Promise<Tag | null>
deleteTag(id: string): Promise<void>
fetchColorTags(colorId: string): Promise<void>
addTagToColor(colorId: string, tagId: string): Promise<void>
removeTagFromColor(colorId: string, tagId: string): Promise<void>
```

- `fetchTags` はアプリ起動時（AppLayout）に一度だけ呼ぶ
- `fetchColorTags` は DetailPanel が開いたとき（color.id が変わったとき）に呼ぶ
- `colorTags` は楽観的更新：UI を先に更新してから Supabase に保存

### uiStore.ts（追加フィールド）

```ts
searchQuery: string
setSearchQuery(q: string): void

activeTagId: string | null
setActiveTagId(id: string | null): void

sortBy: 'order' | 'used_count'
setSortBy(sort: 'order' | 'used_count'): void
```

---

## 検索・絞り込みロジック（AppLayout）

```
colors
  1. favorites フィルター（既存）
  2. 色相フィルター（既存）
  3. searchQuery フィルター（新規）
     対象: name / hex / memo / spot_color / タグ名（colorTags[id]）
     大文字小文字: toLowerCase() で統一
  4. activeTagId フィルター（新規）
     colorTags[id] に該当タグを持つ色だけ残す
  5. sortBy（新規）
     'order': 既存の order 昇順（デフォルト）
     'used_count': used_count 降順
```

検索はクライアントサイドのみ。サーバー全文検索（tsvector）は不使用。

---

## コンポーネント仕様

### TagInput.tsx（新規）

場所: `src/components/color/TagInput.tsx`

**Props:**
```ts
interface TagInputProps {
  colorId: string
  isLocked: boolean
}
```

**動作:**
- 付与済みタグをピル（`bg-surface-overlay rounded-full text-xs px-2 py-0.5`）で横並び表示
- ✕ ボタンで `removeTagFromColor` を呼ぶ
- テキスト入力 → `tags` を前方一致フィルター → ドロップダウン表示
- ドロップダウン末尾に「**「xxx」を作成して追加**」オプション（createTag → addTagToColor）
- Enter / クリックで追加、Escape でドロップダウンを閉じる
- ロック中（`isLocked`）は入力・削除不可

**デザイン（Notion / Figma 参照）:**
- ピルバッジ: `rounded-full px-2 py-0.5 text-xs bg-surface-overlay text-text-secondary`
- ドロップダウン: `bg-surface-raised border border-border rounded-lg shadow-lg`
- 候補アイテム: `px-3 py-1.5 text-sm hover:bg-surface-overlay`
- 「作成して追加」: アクセントカラーでハイライト

### DetailPanel.tsx（修正）

追加内容:
1. **特色メモ（spot_color）インライン編集** — 名前・メモと同パターン（クリックで `<input>` に切り替え、Enter/Blur で保存）
2. **タグセクション** — `<TagInput colorId={color.id} isLocked={color.is_locked} />` を配置

### TagList.tsx（修正）

- モックデータを削除、`tagStore.tags` から実データを描画
- `activeTagId === tag.id` でアクティブスタイル
- `onSelectTag` は `useUIStore().setActiveTagId` を呼ぶ（トグル：同じIDなら null）

### SearchBar.tsx（修正）

- `value` / `onChange` props を廃止
- `useUIStore` から `searchQuery` / `setSearchQuery` を直接使用

### Sidebar.tsx（修正）

- `searchQuery` / `activeTagId` のローカル state を削除
- `SearchBar` への props 渡しを削除（SearchBar が自己完結）
- `TagList` の `onSelectTag` を `uiStore.setActiveTagId` のトグルに変更

### FilterBar.tsx（修正）

- 右端にソート切り替えボタン追加：「並び順」（order）↔「よく使う順」（used_count）
- Notion ピルバッジスタイルでアクティブ状態を表示

### AppLayout.tsx（修正）

- `tagStore.fetchTags()` を起動時に実行
- `searchQuery` / `activeTagId` / `sortBy` を `uiStore` から取得
- `displayColors` の計算に検索・タグ・ソートフィルターを追加

---

## エラー・エッジケース

- タグ名が空文字の場合は作成しない
- 同名タグが既に存在する場合は作成せず既存タグを使う（`fetchTags` 後に重複チェック）
- `fetchColorTags` 中はタグエリアにローディング表示（タグ数が少ないので最小限でよい）
- タグが1件もない場合: TagList に「タグがありません」の空状態表示
- 検索結果が0件の場合: 既存の「色がありません」表示をそのまま使用

---

## 変更ファイル一覧

| ファイル | 操作 |
|---------|------|
| `src/store/tagStore.ts` | 新規作成 |
| `src/store/uiStore.ts` | `searchQuery` / `activeTagId` / `sortBy` 追加 |
| `src/components/color/TagInput.tsx` | 新規作成 |
| `src/components/sidebar/SearchBar.tsx` | uiStore 直接参照に変更・props 廃止 |
| `src/components/sidebar/Sidebar.tsx` | searchQuery / activeTagId ローカル state 削除 |
| `src/components/sidebar/TagList.tsx` | tagStore 実データ接続 |
| `src/components/detail/DetailPanel.tsx` | spot_color 編集 + TagInput 追加 |
| `src/components/views/FilterBar.tsx` | ソート切り替えボタン追加 |
| `src/components/layout/AppLayout.tsx` | 検索・タグ・ソートフィルター追加・fetchTags 呼び出し |
