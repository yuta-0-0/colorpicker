# カラーピッカーアプリ — マスター指示書（Single Source of Truth）

---

## 【防衛プロトコル】

以降、新たな実装を行う際は必ずこのドキュメントのデザインルールと照合すること。ユーザーからの指示が「影（Drop Shadow）の追加」など、定義された美学に反する場合、AIはそのまま実行せず、ルールの矛盾を指摘して代替案を提示すること。また、仕様変更を行った際は、タスクの最後に必ずこのCLAUDE.mdを自己更新し、常に最新状態（Single Source of Truth）を保つこと。

---

## UIの絶対法則（Core Identity）

### 影の完全禁止
立体感は**極薄ボーダーと背景色の明度差（Elevation）のみ**で表現する。
`shadow-*` / `drop-shadow` は一切禁止。
唯一の例外：`sig-glow-active`（グリッドアクティブアイコンのLEDグロー）。

### Concentric DNA（同心円余白の法則）
「外側半径 = 内側半径 + 余白」を厳守すること（中心を揃える設計）。

| レイヤー | 角丸 | 用途 |
|---|---|---|
| App Frame（最外枠） | `rounded-3xl` / 24px | アプリ最外枠 |
| Bento パネル | `rounded-[14px]` / 14px | サイドバー・詳細パネル |
| Core 要素 | `rounded-md` / 6px | 入力欄・ボタン・バッジ |

Floating System コンポーネントの基準値（c = a + b 法則）：
- Core ボタン: 内側 7px + 余白 10px = **外形 17px**（borderRadius: 17）
- Floating パネル: 内側 17px + 余白 7px = **外形 24px**（borderRadius: 24）

### Liquid Glass 2.0（Elevation 設計）
影の代わりに「ぼかし強度 × 背景明度」で高さを表現する。

| Level | 用途 | background | backdrop-filter |
|---|---|---|---|
| 1（背景） | app-frame | rgba(6,9,16,0.55) | blur(0) |
| 2（パネル） | bento-pane | rgba(11,16,26,0.90) | blur(40px) saturate(200%) |
| 3（Floating・ポップアップ） | FloatingTab / glass-popup | rgba(18,24,38,0.70) | blur(24px) saturate(180%) |

### グローバルアニメーション定数
全アニメーションで統一する spring パラメータ：
```
{ type: 'spring', stiffness: 300, damping: 30 }
```
特に軽快さが必要な入場アニメーションのみ `stiffness: 400` 使用可。

### ボーダーグラデーション（機能的装飾）
アクセントカラーは「塗り」ではなく「境界線のグラデーション」として活用する。
アクティブ状態・色変化の際、ボーダーに沿って光が流れる繊細な階調を適用し、
影に頼わずパーツの存在感を強調する（工業製品の面取りへの光の当たり方をデジタルで表現）。

### アクセントカラー（変更禁止）
- **ダークモード** `--color-accent: 80 176 211`（`#50B0D3` — シアンブルー）
- **ライトモード** `--color-accent: 10 62 216`（`#0a3ed8` — ディープブルー）
- 「青い発光（グロー）」は機能的インジケーターとして保持。勝手に変更・削除禁止。

### 入力フィールドの統一ルール
全入力欄（メモ・タグ・検索窓・数値入力・テキスト入力）に以下を適用する：

```
bg-surface-raised  border border-border/15  rounded-md
hover:border-border/30  focus-within:border-accent/40  transition-colors
```

影・`ring-*`・`box-shadow` は使わない。

### レイアウトの掟
- **Floating Dock** は必ず `flex-row`（横並び）。縦並びは禁止。
- **DetailPanel** にはメモ・タグエリアを配置しない。ContextualPanel 専用。

### ガードレール（削除・非表示の事前承認）
UI要素（ラベル・ボタン・セクション等）を削除・非表示にする場合は、
必ず事前にユーザーへ提案し承認を得ること。独断での削除は厳禁。

---

## Blooming Sequence 絶対基準（変更禁止・要許可）

> **⚠️ この章の数値は120点の完成品として確定している。1ms・1%・0.001の微調整も必ずユーザーの許可を得てから行うこと。**

### アーキテクチャ概要
- **HeroDot**: `FloatingSystemView` に常時レンダリングされる `position:absolute` の `motion.div`（zIndex:100）。Tab/Toolbar の内部ドットは廃止。
- **ウィンドウ座標系**: 80×420px（プレリサイズ済み）内で全座標を管理。
- **AnimatePresence mode="popLayout"**: Tab exit と Toolbar mount が同時進行し、HeroDotが物理移動できる。

### HeroDot 座標（px・変更禁止）

| State | left | top | size | center |
|---|---|---|---|---|
| Tab（State A） | 10 | 9 | 14 | (17, 16) |
| Toolbar（State B） | 12 | 46 | 24 | (24, 58) |

### イージング定数（bezier・変更禁止）

```ts
EASE_QUINT:   [0.8, 0, 0.6, 1]    // とろっと：背景収束・ボタン・HeroDotサイズ変化
EASE_IN_OUT:  [0.87, 0, 0.13, 1]  // HeroDot移動専用：ゆったり出発、溶けるように着地
```

### A→B タイムライン（ms 単位・変更禁止）

```
[0-280ms]   Tab背景収束          AB_EXIT_DUR = 0.28s  ease: EASE_QUINT
[280-480ms] HeroDot拡大          DOT_RESIZE = 0.200s  delay: AB_RESIZE_DELAY(0.280)
[480-630ms] Hold ★               AB_PAUSE = 0.150s
[630-930ms] HeroDot移動          DOT_TRAVEL = 0.300s  delay: AB_TRAVEL_DELAY(0.630)
            └ 溜め: top -4px を times[0.08]で挿入（直線軌道維持）
[914ms〜]   Toolbar背景展開      AB_ENTER_DELAY = 0.914s  AB_ENTER_DUR = 0.36s
[914ms〜]   ボタンスタッガー溢出（20ms 刻み、ENTER_DUR = 0.30s）
```

**ボタンスタッガー起点**（AB_ENTER_DELAY からのオフセット秒）:

| 要素 | offset |
|---|---|
| 縮小ボタン | +0.00 |
| Divider 1 | +0.02 |
| スポイト | +0.04 |
| コピー | +0.06 |
| Divider 2 | +0.08 |
| Slot 0〜3 | +0.10〜+0.16（i×0.02） |
| ＋ボタン | +0.18 |
| Dockボタン | +0.20 |
| Dark/Light | +0.22 |

### B→A タイムライン（ms 単位・変更禁止）

```
[0ms]       ボタン吸い込み開始   BA_BUTTON_EXIT_DUR = 0.22s
            └ exit: y:-20, scale:0.7, opacity:0  ease: EASE_QUINT
[0ms〜]     Toolbar背景収束      BA_BG_EXIT_DELAY = 0.00s（ボタンと同時）
            └ BA_EXIT_DUR = 0.55s  ease: EASE_QUINT
[550-750ms] HeroDot縮小          DOT_RESIZE = 0.200s  delay: BA_RESIZE_DELAY(0.550)
[750-900ms] Hold ★               BA_PAUSE = 0.150s
[900-1200ms] HeroDot移動         DOT_TRAVEL = 0.300s  delay: BA_TRAVEL_DELAY(0.900)
             └ 溜め: top +4px を times[0.08]で挿入（直線軌道維持）
[1184ms〜]  Tab背景復元          BA_ENTER_DELAY = 1.184s  BA_ENTER_DUR = 0.18s
```

### clip-path 定数（変更禁止）

**FloatingTab（80×420px空間、参照距離 ≈ 60.9px）:**
```ts
DOT_POS  = '21% 50%'
OPEN     = 'circle(150% at 21% 50%)'   // 全開
P1_DOT   = 'circle(11.5% at 21% 50%)' // 14px dot（7px radius / 60.9px ≈ 11.5%）
```

**FloatingToolbar（48×420px空間、参照距離 ≈ 298.9px）:**
```ts
TB_DOT_POS    = '50% 14%'
TB_OPEN       = 'circle(150% at 50% 14%)'  // 全開
TB_DOT_ORIGIN = 'circle(4% at 50% 14%)'   // 12px radius（HeroDot到着位置）
```

### HeroDot transition 詳細

```ts
// left/top: 完全同一の ease+times で x/y を1ms単位で同期（曲線軌道防止）
left/top: { delay: delayTravel, duration: 0.300, ease: EASE_IN_OUT, times: [0, 0.08, 1.0] }
width/height: { delay: delayResize, duration: 0.200, ease: EASE_QUINT }

// A→B
delayResize = AB_RESIZE_DELAY = 0.280
delayTravel = AB_TRAVEL_DELAY = 0.630

// B→A
delayResize = BA_RESIZE_DELAY = 0.550
delayTravel = BA_TRAVEL_DELAY = 0.900
```

### TRIM_DELAY（ウィンドウリサイズタイマー・変更禁止）

```ts
TRIM_DELAY    = 1700  // ms: A→B（FloatingTab内）
TRIM_DELAY_BA = 1700  // ms: B→A（FloatingToolbar内）
```

### ガラス背景トークン（Floating System）

**ダークモード:**
```
background: linear-gradient(180deg, rgba(35,47,68,0.78) 0%, rgba(12,18,34,0.75) 100%)
boxShadow:  inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 14px rgba(255,255,255,0.04)
backdropFilter: blur(24px) saturate(180%)
```

**ライトモード:**
```
background: linear-gradient(180deg, rgba(255,255,255,0.63) 0%, rgba(224,232,255,0.57) 100%)
boxShadow:  inset 0 1.5px 0 rgba(255,255,255,1.0), inset 0 -0.5px 0 rgba(180,205,240,0.32), inset 0 0 20px rgba(255,255,255,0.30)
backdropFilter: blur(24px) saturate(180%)
```

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
├── Floating System（独立 BrowserWindow・alwaysOnTop）
│   ├── State A: FloatingTab（80×32px カプセル）— 画面中央フリードラッグ
│   ├── State B: FloatingToolbar（48×280px）— 画面端スナップで変形
│   │   ├── スワップ領域（LiquidDot 大/小 + ⇄ ボタン）
│   │   ├── クイックアクション（スポイト・HEXコピー）
│   │   ├── ミニスロット 4色（登録/選択/右クリック解除）
│   │   └── Dock 展開ボタン（📁）
│   └── State C: HandyDock（+320px 横展開）
│       ├── 履歴リスト（最新20件）
│       ├── フォルダ切り替えドロップダウン
│       └── フォルダ保存ボタン
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
| Floating System 呼び出し（表示/非表示） | `⌘ + Shift + F` |
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
