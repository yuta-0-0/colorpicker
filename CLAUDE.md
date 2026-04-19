# カラーピッカーアプリ — マスター指示書（Single Source of Truth）

---

## 【防衛プロトコル】

以降、新たな実装を行う際は必ずこのドキュメントのデザインルールと照合すること。ユーザーからの指示が「影（Drop Shadow）の追加」など、定義された美学に反する場合、AIはそのまま実行せず、ルールの矛盾を指摘して代替案を提示すること。また、仕様変更を行った際は、タスクの最後に必ずこのCLAUDE.mdを自己更新し、常に最新状態（Single Source of Truth）を保つこと。

---

## UIの絶対法則（Core Identity）

### 影の完全禁止
立体感は**極薄ボーダー（border）と背景色の明度差（Elevation）のみ**で表現する。
`shadow-*` 系クラスの使用は一切禁止。`drop-shadow` も同様。
唯一の例外：`sig-glow-active`（グリッドアクティブアイコンのLEDグロー）のみ許可。

### Concentric Radius（角丸の法則）
同心円状に内側へ行くほど角丸を小さくする。この比率は厳守すること。

| レイヤー | クラス | 実値 | 用途 |
|---|---|---|---|
| 外側コンテナ（App Frame） | `rounded-3xl` | 24px | アプリ最外枠 |
| Bentoパネル | `rounded-[14px]` | 14px | サイドバー・詳細パネル |
| Core要素 | `rounded-md` | 6px | 入力欄・ボタン・バッジ |

### アクセントカラー
- **ダークモード** `--color-accent: 80 176 211`（`#50B0D3` — シアンブルー）
- **ライトモード** `--color-accent: 10 62 216`（`#0a3ed8` — ディープブルー）
- ライトモードのアクセントは変更しないこと。

### 入力フィールドの統一ルール
全入力欄（メモ・タグ・検索窓・数値入力・テキスト入力）に以下を適用する：

```
bg-surface-raised
border border-border/15
rounded-md
hover:border-border/30
focus:border-accent/40  または  focus-within:border-accent/40
transition-colors
```

影・`ring-*`・`box-shadow` は使わない。

### レイアウトの掟
- **Floating Dock** は必ず `flex-row`（横並び）。縦並びは禁止。
- **DetailPanel** にはメモ・タグエリアを配置しない。メモ・タグはメインコンテナ内の `ContextualPanel`（カラー詳細エリア）にのみ配置する。

---

## プロジェクト概要

グラフィックデザイナー・DTPデザイナー向けのカラー管理アプリ。
Mac（Electron）とiPhone（PWA）の両対応。Supabaseによるリアルタイム同期あり。
クローズドベータとして招待コード制で配布。

---

## 技術スタック

| 項目 | 技術 |
|---|---|
| Mac | Electron + React |
| iPhone | PWA（React、Service Worker） |
| バックエンド | Supabase |
| 認証 | Google OAuth（Supabase Auth） |
| オフライン | Service Worker + IndexedDB キャッシュ |
| スタイル | Tailwind CSS |
| 言語 | TypeScript |
| アイコン | `@phosphor-icons/react` v2.1.10（**必ず `Icons.tsx` 経由で使用**） |
| アニメーション | `framer-motion` |

---

## DB設計（確定仕様）

### 基本方針
- 保存はHEX・alpha・CMYKのみ
- RGB・HSLは表示時に都度計算（DB保存しない）
- CMYKは印刷用途のため**手動入力・手動保存**（計算値と別管理）
- 全テーブルにRLS（Row Level Security）を適用：`user_id = auth.uid()`
- インデックス必須：user_id / folder_id / tag_id / hex / updated_at / is_favorite / is_archived

### テーブル：colors

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| folder_id | uuid | FK → folders（nullable） |
| hex | text | #RRGGBB |
| alpha | float | 0.0〜1.0 |
| c, m, y, k | float | 印刷用CMYK（手動入力・nullable） |
| cmyk_source | text | manual / converted / print_spec |
| name | text | 色名（nearest-color自動生成・上書き可） |
| spot_color | text | 特色メモ（PANTONE / DIC等） |
| memo | text | 一言メモ |
| is_locked | bool | 色単位ロック |
| is_favorite | bool | お気に入り |
| is_archived | bool | アーカイブ |
| order | int | 並び順 |
| used_count | int | コピー時に+1 |
| last_used_at | timestamp | 最後にコピーした日時 |
| created_at | timestamp | |
| updated_at | timestamp | |

**確定ルール**
- 同一HEXが追加された場合：重複作成せず `updated_at` を更新してリスト最上部に移動
- `used_count` はコピーボタンを押したときのみ +1。詳細パネルを開いただけでは加算しない

### テーブル：folders

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| parent_id | uuid | FK → folders（nullable・サブフォルダ対応） |
| name | text | フォルダ名 |
| icon | text | アイコンキー（nullable） |
| is_locked | bool | フォルダ単位ロック |
| order | int | 並び順 |
| created_at | timestamp | |

### テーブル：tags / color_tags

| テーブル | カラム | 型 |
|---|---|---|
| tags | id, user_id, name | uuid, uuid, text |
| color_tags | color_id, tag_id | uuid FK, uuid FK |

### テーブル：color_history（ローカルのみ）

- 保存先：IndexedDB（Supabase同期なし）
- 最新50件を保持（FIFO）
- 同一HEXは上書き
- 「保存」ボタンを押した色だけSupabaseに同期

### テーブル：invitations（クローズドベータ管理）

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid | PK |
| code | text | 招待コード |
| used_by | uuid | FK → auth.users（nullable） |
| used_at | timestamp | |
| created_at | timestamp | |

---

## UI構成（現行）

```
├── サイドバー（bento-pane）
│   ├── 3×3 グリッドメニュー（ナビゲーション＋アクション）
│   ├── 検索バー
│   ├── フォルダ一覧（ドラッグ並び替え・サブフォルダ対応）
│   └── タグ一覧
│
├── メインエリア（bento-pane-neutral）
│   ├── ビュー切り替えタブ（リスト / ギャラリー）
│   ├── フィルターバー
│   ├── リストビュー（各行：丸アイコン・名前・HEX・コピー・削除・ロック・★）
│   ├── ギャラリービュー（丸アイコングリッド・色相順）
│   └── カラー詳細エリア（ContextualPanel）
│       ├── ムード画像スロット
│       ├── メモ（Textarea・拡大モーダル付き）
│       └── タグ（ドロップダウン付き）
│
├── 詳細パネル（bento-pane）
│   ├── 丸アイコン（大）＋白/黒背景切り替え
│   ├── 色名（クリックで直接編集）
│   ├── 各フォーマット＋個別コピー（HEX/RGB/RGBA/HSL/HSLA/CMYK）
│   ├── 透明度スライダー
│   ├── CMYK手動入力＋TAC値＋色域警告
│   ├── 特色メモ
│   └── コントラストチェッカー・色覚シミュレーション（モード切替）
│
├── Floating Dock（flex-row 横並び固定）
│   └── ゴミ箱・書き出し・テーマ切替 等
│
└── ピッカーオーバーレイ
    ├── 画像スポイト（1色）
    ├── 画像パレット一括抽出（上位5色）
    └── スクリーンピッカー（Macのみ）
```

---

## ショートカットキー（Mac・Electron）

| 操作 | ショートカット |
|---|---|
| アプリをグローバル呼び出し | `⌘ + Shift + P` |
| スクリーンピッカー起動 | `⌘ + Shift + C` |
| 新規カラー追加 | `⌘ + N` |
| 新規フォルダ作成 | `⌘ + Shift + N` |
| 選択色をコピー（デフォルト形式） | `⌘ + C` |
| 選択色を複製 | `⌘ + D` |
| 選択色を削除 | `⌘ + Delete` |
| Undo | `⌘ + Z` |
| Redo | `⌘ + Shift + Z` |
| 検索 | `⌘ + F` |
| カラージェネレーター | `⌘ + G` |
| リスト / ギャラリー切り替え | `⌘ + 1 / ⌘ + 2` |

---

## 意思決定ログ（採用しなかった機能）

| 項目 | 除外理由 |
|---|---|
| color_profile（sRGB/P3/AdobeRGB） | 実装コスト過多・現場との乖離 |
| version（楽観的ロック） | 同時編集のユースケースが限定的 |
| lock_type（編集/削除の分離） | UX複雑化の割にメリット薄い |
| CSS Variables / トークン出力 | ターゲット外（エンジニア向け） |
| カラーミックス（中間色生成） | カラージェネレーターで代替可・v2以降 |
| 自動タグ（warm/cool等） | タグ機能で代替可 |
| tsvector（全文検索） | 現時点の規模では不要 |
| iPhoneカメラスポイト | v2以降で検討 |
| ドラッグ&ドロップでイラレに直接 | 実装コスト重い・v2以降 |
| 用紙別プレビュー | 精度が出しにくい・v2以降 |

---

## 補足仕様

### レスポンシブ
- ブレイクポイント `md: 768px` 基準
- モバイル時はサイドバーをハンバーガーメニューに格納
- Electron時は常にサイドバーを表示

### オフライン時のUI
- Supabase保存失敗時：トースト「ローカルに保存しました。オンライン復帰時に自動で同期されます」
- 復帰後に自動同期、完了時にもトースト通知

### バリデーション
- HEX / RGB / HSL入力時、不正な値はリアルタイム検知
- 不正：入力フォームの枠線を赤にする（`border-red-500`）
- 保存ボタンは不正値がある間は非活性

### 運用
- 配布形式：Mac = DMGファイル直配布、iPhone = URL共有（PWA）
- クローズドベータ：招待コード制・再配布禁止をアプリ内に明記
- 保存数上限：1ユーザーあたり500色（正式版では1000〜無制限を検討）
- 将来的にApp Store申請を想定した構成を維持
