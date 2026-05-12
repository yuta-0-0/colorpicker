# ステップ5 カラー取得機能 設計書

## 概要

「＋ 追加」ボタンを3択メニューに拡張し、テキスト入力・画像スポイト・スクリーンピッカーの3つのカラー取得方法を提供する。

---

## ユーザーフロー

```
「＋ 追加」クリック
  ↓
AddMenuPopover（3択ミニメニュー）
  ├─ テキストで入力  → AddColorModal（既存・変更なし）
  ├─ 画像から取得    → ImagePickerModal（新規）
  └─ スクリーンから取得 → EyeDropper API 直接実行（Electron環境のみ表示）
```

---

## コンポーネント設計

### 1. AddMenuPopover（新規）

**ファイル**: `src/components/color/AddMenuPopover.tsx`

**役割**: 「＋ 追加」ボタン直下に表示する3択ポップオーバー。

**仕様**:
- ボタンの下端に `position: absolute` で表示
- 外部クリック（`mousedown` イベント）で閉じる
- `window.EyeDropper` の有無でスクリーン選択肢を表示切り替え（Electron環境のみ）
- 各選択肢クリックで対応するモーダル/処理を起動してポップオーバーを閉じる

**UI**:
```
┌──────────────────┐
│ テキストで入力    │
│ 画像から取得      │
│ スクリーンから取得 │  ← EyeDropper対応環境のみ
└──────────────────┘
```

**Props**:
```ts
interface AddMenuPopoverProps {
  onSelectText: () => void
  onSelectImage: () => void
  onSelectScreen: () => void
  onClose: () => void
}
```

---

### 2. ImagePickerModal（新規）

**ファイル**: `src/components/color/ImagePickerModal.tsx`

**役割**: 画像アップロード→スポイト1色取得・パレット5色一括取得の両機能を1モーダルに統合。

**依存ライブラリ**: `colorthief`（npm追加が必要）

**仕様**:

#### 画像アップロード
- ドラッグ&ドロップ または クリックしてファイル選択（`<input type="file" accept="image/*">`）
- アップロード後、`<canvas>` に描画して表示

#### スポイト（1色）
- キャンバス上をクリック → `getImageData(x, y, 1, 1)` でRGB取得
- RGBをHEXに変換してプレビュー表示
- 「この色を追加」ボタンで保存

#### パレット抽出（5色）
- 画像アップロード時に `colorthief.getPalette(imgEl, 5)` を自動実行
- 5色のスウォッチを横並びで表示
- 各色にチェックボックス（デフォルト全選択）
- 「選択した色を追加（N色）」ボタンで一括 `addColor` 実行

**UI レイアウト**:
```
┌──────────────────────────────────────────┐
│  画像をドロップ、またはクリックして選択    │
│  [画像 or キャンバス表示エリア]           │
│  ↑ クリックで1色スポイト                 │
│                                          │
│  スポイト結果: ● #3A7BD5 [この色を追加]   │
│                                          │
│  抽出パレット:                            │
│  ● ● ● ● ●                              │
│  ☑ ☑ ☑ ☑ ☑  選択した色を追加（5色）     │
│                                          │
│              [キャンセル]                 │
└──────────────────────────────────────────┘
```

**Props**:
```ts
interface ImagePickerModalProps {
  onClose: () => void
}
```

**内部状態**:
```ts
const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
const [eyedropperHex, setEyedropperHex] = useState<string | null>(null)
const [palette, setPalette] = useState<string[]>([])
const [selectedPalette, setSelectedPalette] = useState<boolean[]>([])
const [saving, setSaving] = useState(false)
const canvasRef = useRef<HTMLCanvasElement>(null)
const imgRef = useRef<HTMLImageElement>(null)
```

---

### 3. スクリーンピッカー（インライン処理）

モーダルを開かず、`AddMenuPopover` の「スクリーンから取得」クリック直後に実行。

```ts
const handleScreenPick = async () => {
  try {
    const eyeDropper = new (window as any).EyeDropper()
    const { sRGBHex } = await eyeDropper.open()
    await addColor(sRGBHex, 1.0, activeFolderId)
  } catch {
    // ユーザーキャンセル時は何もしない
  }
}
```

---

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/components/color/AddMenuPopover.tsx` | 新規作成 | 3択ミニメニュー |
| `src/components/color/ImagePickerModal.tsx` | 新規作成 | 画像スポイト＋パレット |
| `src/components/layout/AppLayout.tsx` | 変更 | AddMenuPopoverへの切り替え、スクリーンピッカー処理 |
| `package.json` | 変更 | `colorthief` 追加 |

`AddColorModal.tsx` は変更なし。

---

## エラー・エッジケース

| ケース | 対応 |
|-------|------|
| EyeDropperユーザーキャンセル | catch してサイレントに無視 |
| 非対応ブラウザ（EyeDropper未定義） | メニューにスクリーン選択肢を表示しない |
| 画像読み込み失敗 | アップロードエリアにエラーメッセージ表示 |
| colorthief がパレット取得失敗 | パレット欄を非表示にする |
| 画像クリックでキャンバス未初期化 | canvasRef.current が null なら早期 return |
| 「この色を追加」後のモーダル状態 | モーダルは閉じる（再取得は再度メニューから） |
| 「選択した色を追加」後のモーダル状態 | 一括保存後にモーダルを閉じる |

---

## インストール依存

```
colorthief  （npm install colorthief）
@types/colorthief （型定義が別途必要な場合）
```

---

## 採用しなかった選択肢

| 選択肢 | 除外理由 |
|-------|---------|
| AddColorModalをタブ拡張 | モーダルが肥大化する |
| desktopCapturer | IPC通信が必要で実装コストが高い |
| Canvas自前パレット抽出 | colorthiefで十分・品質が確実 |
