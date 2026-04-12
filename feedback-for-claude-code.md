# コード君への指示書（ブラッシュアップ版）

作成日: 2026-04-11
更新者: ゆうた

---

## 📋 現在の進捗

ステップ 1〜13（CLAUDE.md 推奨順序）はすべて完了。
P2バックログの作業中。特に「タグ管理インライン編集・削除UI」は今セッション完了済み。

詳細な実装状況は別紙「【カラーピッカーアプリ 実装状況レポート】」を参照。

（中略：Task 1-6 + P4 + Task 4 型安全化 + Task 5 Prism Tile + Task 6 Lism CSS は完了済み）

---

## Task 7: Inline Contextual Panel & Info Separation

色をクリック → その行直下に Accordion パネル展開。
DetailPanel にあった「メモ・タグ」を展開パネルへ移動。
DetailPanel には数値データ（HEX/RGB/CMYK等）のみ残す。

展開パネルレイアウト：
- 左：インスピレーション画像（最大3枚）
- 右：メモ・タグ
- 1px vertical セパレーター

アニメーション：{ stiffness: 400, damping: 25 }、要素は 0.1s 遅れてフェードイン

---

## Task 8: Inline Mood Snippets - Horizontal Layout

Task 7 の展開パネル内の画像エリアを実装。
- 最大3枚の正方形サムネイル（1:1、object-cover）
- クリックで Lightbox 拡大（framer-motion layoutId）
- 空スロットは破線枠 + クリックでアップロードUI
- Stagger アニメーション（0.05s ずつ）

---

## Task 9: UI Upgrade - Elevated Frosted Context Panel

展開パネルにガラス質感と浮遊感を追加。
- backdrop-filter: blur(16px) + rgba(8,9,15,0.9)
- inset shadow：inset 0 1px 0 rgba(255,255,255,0.1)
- 展開時スケール：0.98→1.0（Spring）
- Lightbox オーバーレイも blur(16px) で統一

---

## Task 10: 全体美学 & バグ修正（完了済み）

### 1. 全体：Liquid Glass & Precision

**Vibrancy（生きた透明感）**
ガラス要素（パネル・ドロップダウン・ドック）は `backdrop-filter: blur(24px) saturate(180%)` を適用。
不透明度は 0.7 を基準とし、背後の色が濁らず鮮やかに透けるmacOS品質を追求。

**フラッシュ防止（厳守）**
背景や境界線を透明にする際、`transparent` キーワードは使用禁止。
必ず `rgb(var(--color-surface) / 0)` のように、対象と同じ色のアルファ値0 を指定すること。

**Tactile Feedback（触感）**
ボタンやアイテムは、ホバーで「わずかに発光」、クリックで `scale: 0.97` に「ぷにっ」と縮むLiquidインタラクション。

**Minimalist Canvas**
背景に余計なテクスチャやグリッドは配置せず、ソリッドで清潔な余白を維持。

### 2. メイン：Pro-Selection & Sort

**Selection**
Shift（範囲）/ Cmd・Ctrl（個別）選択を完備。複数選択モード中は `user-select: none`。

**Integrated Plate（一体化）**
選択中の行と展開パネル（Contextual Panel）を、左右と下の隙間がない「一つの浮き上がった曇りガラスのプレート」として統合。

**Strict Sort**
色相順を「赤→橙→黄→緑→青→紫→ピンク→白→灰→黒」に厳格化。UI上の文字は消し、アイコンのみで表現。

### 3. 詳細パネル：Technical Desk

- 透明度スライダー操作時に色丸のサイズが変化するバグを修正（サイズ固定）
- IME isComposing ガードを全入力に実装
- 詳細パネル内を独立スクロール（`overflow-y: auto`）化

### 4. 左パネル：macOS Navigation

- lucide-react 導入、絵文字を全廃してベクターアイコンに統一
- サイドバーをドラッグでリサイズ可能（Finder風）+ 開閉ボタン
- 最近使った色をクリックで該当行へ scrollIntoView + 選択状態

### 5. 遊び心（Asobigokoro）

- 複数選択時、画面上部にFigmaスタイルのContextual Toolbarを表示
- Dynamic Favicon：選択中の色でタブアイコンをリアルタイム更新

---

## Task 11: Liquid Floating Dock - Morphing & Draggable

### 形態の定義

| 形態 | サイズ |
|------|--------|
| Mini Tile | 320 × 140px の浮遊ウィンドウ |
| Floating Tab (Accordion) | 幅 24px / 高さ 80px 程度の「厚みのあるカプセル型」 |

### 物理挙動
framer-motion の `drag` を実装。画面内のどこへでも自由に配置可能。
ドラッグ中は `opacity: 0.5` で透過度を高める。

### 質感とインジケーター
- `blur(32px)` の厚みのある液体カプセルとしての存在感
- 中央に現在選択中の色を示す **8px の「Liquid Dot」** を配置
- 色がじわっと変化するアニメーション（framer-motion `animate` で補間）

### Morphing
ダブルクリックで「Mini ↔ Tab」を相互に変容。
スプリング設定：`{ stiffness: 300, damping: 30 }`（粘り気のある変形）

---

## Task 12: Legendary Match - Strict Edition

### 厳密な照合
HEX値がブランド色と **100% 完全一致（Strict Match）** した場合のみ発動。
近似値では発動させないこと。

### データベース
`src/lib/data/legendaryColors.ts` を作成。

初期登録ブランド色：
| ブランド | HEX |
|----------|-----|
| Tiffany & Co. | #81D8D0 |
| ドラえもん | #009EDB |
| Hermès | #F37021 |
| Starbucks | #00704A |
| Coca-Cola | #F40009 |

### 発見の演出
マッチした瞬間：
- パネル全体をそのブランドカラーで一瞬「じわっと発光（Glow）」
- Liquid Glass質感の「Legendary Match」バッジを表示

---

## 実装順序

1. Task 10（全体美学 & バグ修正）← 完了
2. Task 11（浮遊ドック）
3. Task 12（Legendary Match）
4. 型安全化・リファクタリングの継続

