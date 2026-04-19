# Step 6: ショートカットキー設計仕様

## スコープ

キーボードショートカット全般の実装。ロック・お気に入いは実装済みのため変更なし。Undo/Redo（⌘+Z/⌘+Shift+Z）は Step 11 まで除外。

---

## 実装ショートカット一覧

| キー | 動作 | 条件 |
|------|------|------|
| `⌘+N` | 新規カラー追加モーダルを開く | 入力中でない |
| `⌘+Shift+N` | サイドバーのフォルダ追加UIを開く | 入力中でない |
| `⌘+C` | 選択中の色をHEXでコピー | 色が選択済み・入力中でない |
| `⌘+D` | 選択中の色を複製 | 色が選択済み・入力中でない |
| `⌘+Delete` | 選択中の色を削除 | 色が選択済み・ロック中でない・入力中でない |
| `⌘+F` | 検索バーにフォーカス | 入力中でない |
| `⌘+G` | カラージェネレーターセクションへ移動 | 入力中でない |
| `⌘+1` | リストビューに切り替え | 入力中でない |
| `⌘+2` | ギャラリービューに切り替え | 入力中でない |
| `⌘+Shift+C` | スクリーンピッカー起動 | 入力中でない |

---

## アーキテクチャ

### 新規ファイル

**`src/hooks/useKeyboardShortcuts.ts`**

- `document` に `keydown` イベントリスナーを登録
- `input` / `textarea` / `contenteditable` にフォーカスがある間は全ショートカットを無効化
- `useEffect` でマウント時登録・アンマウント時解除
- 依存する store から最小限のセレクターで値を取得

### uiStore 追加フィールド

```ts
searchFocusTrigger: number   // インクリメントで SearchBar がフォーカス
isAddingFolder: boolean      // true のとき FolderList がインライン入力を表示
triggerSearchFocus: () => void
setIsAddingFolder: (v: boolean) => void
```

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/hooks/useKeyboardShortcuts.ts` | 新規作成 |
| `src/store/uiStore.ts` | `searchFocusTrigger`, `isAddingFolder` 追加 |
| `src/components/sidebar/SearchBar.tsx` | `searchFocusTrigger` 監視 → `.focus()` |
| `src/components/sidebar/FolderList.tsx` | `isAddingFolder` 対応のインライン入力追加 |
| `src/components/layout/AppLayout.tsx` | `useKeyboardShortcuts` 呼び出し |

---

## UI デザイン指針

### ベース
アプリはダークモード専用。既存のトークン（`bg-surface`, `text-text-primary`, `border-border` 等）を継承する。

### Figma 参照
- **フォーカスリング**: ⌘+F で検索バーがフォーカスされたとき、`outline: 2px dashed` のフォーカスリング（Figma のエディタ選択ハンドルを模した署名スタイル）
- **入力フィールド**: フォルダ追加インライン入力は角丸 `rounded` + ピル的なクリーンな外観

### Notion 参照
- **ショートカットバッジ**: ツールチップ内のショートカットキー表示は、Notion のピルバッジスタイルを踏襲。`rounded-full`, `text-xs`, `font-mono`, `px-1.5 py-0.5` でコンパクトに表示
- 例: `⌘N` のバッジ → 半透明の暗いサーフェスに小さいモノスペースラベル

### フォルダ追加インライン入力（⌘+Shift+N）
- サイドバーのフォルダリスト末尾にインライン `<input>` が出現
- `Enter` で確定、`Escape` でキャンセル
- Notion 参照の入力スタイル: `rounded-md border border-border bg-surface-overlay px-2 py-1 text-sm`

---

## エラー・エッジケース

- `⌘+C` は色が未選択なら何もしない（無音で失敗）
- `⌘+Delete` はロック中の色には作用しない（無音で失敗）
- `⌘+Shift+C`（EyeDropper）はブラウザ非対応時は何もしない（既存実装と同じ）
- `⌘+D` は `addColor` を呼び出す（同一HEX上書きルールに従う）
