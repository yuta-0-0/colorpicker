# Mini Web Preview (ColorPreviewCard) — 設計仕様書

作成日: 2026-04-19
ブランチ: feature/task12-legendary-match

---

## 概要

選択した色を安全にテストするための独立した「Mini Web Preview」コンポーネント（`ColorPreviewCard`）を実装する。
アプリ全体のCSS変数を書き換える旧UITestView方式を完全に破棄し、スコープ化されたインラインスタイルのみで動作する独立したプレビューコンポーネントを提供する。

---

## 破棄対象

以下を完全削除する：

- `src/components/uitest/UITestView.tsx`
- `src/store/uiTestStore.ts`
- `[data-ui-test-active]` に関連するCSSおよびグローバルCSS変数操作ロジック一切

現在の透過Bentoグラス・Fluidアニメーション・シグネチャーカラー（Glow）のスタイル基盤には一切手を加えない。

---

## UIパターン（既存踏襲）

ContrastChecker と全く同じUIパターンを踏襲する：

- サイドバーのグリッドアイコン（`IconLayout`）をトリガーとする
- アクティブ時は `activeSection = 'preview'` / `activeMode = 'preview'` にセット
- `ContextualPanel` 内で `activeMode === 'preview'` のとき `ColorPreviewCard` を描画
- 右側の DetailPanel は固定で残し、数値参照とプレビュー確認を同時に行えるレイアウトを維持

---

## ファイル構成

### 削除

```
src/components/uitest/UITestView.tsx
src/store/uiTestStore.ts
```

### 新規作成

```
src/store/previewStore.ts
src/components/detail/ColorPreviewCard.tsx
```

### 変更

```
src/store/uiStore.ts                       — activeMode / activeSection の型拡張
src/components/color/ContextualPanel.tsx   — preview 分岐追加 + syncBg useEffect
src/components/layout/AppLayout.tsx        — UITestView 参照削除
src/components/sidebar/Sidebar.tsx         — ui-test → preview へ改名・ハンドラ変更
src/components/ui/Icons.tsx                — 必要に応じて確認（IconLayout 転用）
src/lib/colorUtils.ts                      — WCAG計算ユーティリティを切り出し
```

---

## `previewStore` 設計

### 型定義

```typescript
type SlotKey = 'bg' | 'text' | 'button' | 'accent'

interface PreviewSlot {
  hex: string | null   // null = 未割り当て（Accentの初期状態）
  isAuto: boolean      // true = WCAG自動計算, false = ユーザー手動指定
}

interface PreviewStore {
  slots: Record<SlotKey, PreviewSlot>
  activeSlot: SlotKey | null

  syncBgFromSelected(hex: string): void
  setSlot(key: SlotKey, hex: string): void
  clearSlot(key: SlotKey): void
  setActiveSlot(key: SlotKey | null): void
  reset(): void
}
```

### 初期化ルール

| スロット | 初期値 | isAuto |
|---------|--------|--------|
| `bg`     | selectedColorId のHEX | `false` |
| `text`   | bgに対してWCAG AA対応の黒 or 白を自動選択 | `true` |
| `button` | bgに対してWCAG AA対応の黒 or 白を自動選択（text と独立計算） | `true` |
| `accent` | `null`（未割り当て） | `true` |

### 再計算ルール

`syncBgFromSelected` が呼ばれたとき：
- `bg` スロットを更新（isAutoに関わらず）
- `isAuto: true` のスロットのみ再計算する
- `isAuto: false`（ユーザー手動指定済み）のスロットは変更しない

### WCAG自動計算

`ContrastChecker.tsx` の相対輝度計算ロジックを `colorUtils.ts` のユーティリティ関数として切り出す。
`previewStore` と `ContrastChecker` の両方から参照し、重複実装を排除する。

```typescript
// colorUtils.ts に追加
export function getWcagContrastColor(bgHex: string): '#000000' | '#ffffff'
export function getContrastRatio(hex1: string, hex2: string): number
```

---

## `ColorPreviewCard` UI仕様

### カード構造

```
┌────────────────────────────────────────┐ ← bg slot色
│  Sample Heading                        │ ← text slot色
│  Body copy. Lorem ipsum…              │ ← text slot色 / opacity 0.65
│  ─────────────────────────────────────┤ ← accent slot色（null = 点線グレー）
│  ┌─────────────┐   ╔═══════╗          │
│  │ Primary Btn │   ║ Badge ║          │ ← button slot色 / accent slot色
│  └─────────────┘   ╚═══════╝          │
└────────────────────────────────────────┘
```

- すべての色はインラインスタイルで適用。グローバルCSS変数には一切触れない
- ボタンのテキスト色はボタン背景色に対して自動コントラスト計算
- Accentが `null` の場合：仕切り線を点線グレー、バッジを `?` プレースホルダーで表示

### サイズ・スタイル

- 幅：`w-full`（ContextualPanelの利用可能幅いっぱい）
- 高さ：固定 `160px`
- スタイル：`rounded-xl p-4`（Bentoグラスパターン踏襲）

### スロットバッジ（割り当て操作UI）

カード直下（`mt-3`）に4つのピルバッジを横並び：

```
[BG #3A7BD5]  [Text #FFFFFF ✓]  [Btn #F2C94C ⚠]  [Accent — 未割り当て]
```

**操作フロー：**
1. バッジをクリック → `activeSlot` にセット、シアンリング（`--color-accent-ring`）でハイライト
2. リストアイテムをクリック → `setSlot(activeSlot, hex)` 実行、`activeSlot = null` にリセット
3. バッジを再クリック（割り当て済みのとき）→ `clearSlot` で手動指定解除、`isAuto: true` に戻して再計算

`isAuto: true` のスロットには小さく「auto」ラベルを添える。

### コントラスト警告

| 条件 | 表示 |
|------|------|
| `contrast(bg, text) < 4.5`（WCAG AA 不合格） | Text バッジ横に `<WarningCircle weight="fill" />` |
| `contrast(bg, button) < 1.5`（ボタンが背景に溶ける） | Btn バッジ横に `<WarningCircle weight="fill" />` |
| Accent が null | 警告なし |

`<WarningCircle />` にはツールチップを付与：  
「コントラスト比 X.X — WCAG AA 基準（4.5）を下回っています」

---

## 既存ファイルへの変更仕様

### `uiStore.ts`

```typescript
// activeMode
'normal' | 'contrast' | 'preview'   // 'preview' を追加

// activeSection
'all' | 'favorites' | 'history' | 'generator' | 'preview' | 'trash'
// 'ui-test' → 'preview' に改名
```

### `ContextualPanel.tsx`

```typescript
// ContrastChecker の分岐と同パターンで追加
if (activeMode === 'contrast') return <ContrastChecker />
if (activeMode === 'preview') return <ColorPreviewCard />
// fallthrough → normal モード

// selectedColorId 変化時に syncBg を呼ぶ useEffect を追加
useEffect(() => {
  if (selectedColor?.hex) {
    previewStore.syncBgFromSelected(selectedColor.hex)
  }
}, [selectedColor?.hex])
```

### `AppLayout.tsx`

- `UITestView` のインポートと描画分岐を削除
- `activeSection === 'ui-test'` の判定を `'preview'` に変更（またはそのまま削除）

### `Sidebar.tsx`

```typescript
// ui-test セクションのハンドラを変更
onClick={() => {
  setActiveSection('preview')
  setActiveMode('preview')
}}
```

他セクションへの移動時に `activeMode` を `'normal'` に戻す既存ロジックと合わせて動作させる。

---

## 実装しないもの（スコープ外）

- ドラッグ＆ドロップでのスロット割り当て（クリック操作で十分）
- プレビューカードのテーマ切り替え（light/dark）
- プレビューレイアウトの複数パターン選択
- previewStore 状態のSupabase同期（ローカル状態のみ）
