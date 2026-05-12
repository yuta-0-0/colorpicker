# カラーピッカーアプリ — マスター指示書（Single Source of Truth）
# .blue Implementation OS（v4.0 — Canonical Kernel Edition）

---

## 0. SYSTEM DEFINITION（OS定義）
本ドキュメントは以下3層を持つ単一OSである。
- **L1: CORE OS LAYER（.blue Kernel）**
- **L2: APPLICATION LAYER（Color Picker）**
- **L3: IMPLEMENTATION LAYER（Tech Stack）**
※下位レイヤは上位レイヤを絶対に変更できない。

---

## 1. CORE OS LAYER（.blue Kernel）

### 1.1 PRIORITY RULE（絶対階層）
すべての意思決定は以下の順序で解決される。
1. **SPATIAL_CONSTRAINT（空間整合性）**
2. **INPUT_CONTINUITY（入力非遮断）**
3. **EMBODIMENT（身体記憶）**
4. **COGNITIVE_LOAD（認知負荷最小化）**
5. **IMPLEMENTATION_ACCURACY（実装正確性）**
6. **OPERATIONAL_EFFICIENCY（運用効率）**

### 1.2 EXECUTION CONTRACT
#### Plan First
実装前に必ず以下を提示：
- 実装方針 / 影響範囲 / 変更対象 / リスク / Success Criteria
※承認前実装は禁止。

#### Scope Lock
指示外変更禁止：
- UI変更（余白・角丸・色含む）
- アニメーション調整
- リファクタリング / コンポーネント統合

#### Definition Rule
曖昧表現禁止：
- 「いい感じ」「自然」「適切」は全て数値または状態定義に変換せよ。

### 1.3 FORBIDDEN SYSTEM
- **UI:** box-shadow, skeuomorphism, グラデーション装飾, glow（機能外）, blur（装飾目的）
- **SYSTEM:** 入力ブロック（0ms含む）, CPU/GPU常時負荷, Retina前提設計, 不要observer, IME未対応

### 1.4 INPUT CONTINUITY（絶対保証）
- **定義:** INPUT_BLOCK = any latency > 0ms
- UI must always accept next input immediately.
- **禁止:** animation blocking input, async UI lock, submit delay

### 1.5 FAILURE MODEL
エラーは状態遷移として扱う。
- **禁止:** モーダル, 点滅, 警告演出
- **必須:** 復帰可能性, 作業継続性維持

### 1.6 MOTION GRAMMAR
- hover: 120ms / focus: 180ms / open: 240ms / morph: 320–480ms / dissolve: 1500ms
- **Easing:**
  - quint: [0.8, 0, 0.6, 1]
  - smooth: [0.87, 0, 0.13, 1]
  - spring: (300, 30)

### 1.7 VISUAL KERNEL
- **Elevation（影禁止）:** - L1: rgba(6,9,16,0.55)
  - L2: rgba(11,16,26,0.90) blur 40px
  - L3: rgba(18,24,38,0.70) blur 24px
- **Glass System:**
  - CLEAR_GLASS: blur 0–12 / no noise
  - GRAIN_GLASS: blur 24 / 3–5% noise
- **Concentric DNA:** R_outer = R_inner + Padding
- **角丸:** Frame: 24px / Panel: 14px / Core: 6px

---

## 2. APPLICATION LAYER（Color Picker）

### 2.1 SYSTEM PURPOSE
.blue上で動作するカラー管理アプリケーション。
- 目的: 色彩操作の高速化, 認知負荷削減, 長時間作業耐性, 身体記憶最適化

### 2.2 UI STRUCTURE
- Sidebar（bento-pane）
- Main Area（bento-pane-neutral）
- Detail Panel
- Floating Dock（横固定）
- Floating System（独立Window）
- Picker Overlay

### 2.3 INPUT SYSTEM RULES
- **IME Guard:** IME変換中 Enterによる Save/Search/Submit/Register の発火禁止。
- **Shortcuts:**
  - ⌘+Shift+P → Command / ⌘+Shift+F → Floating / ⌘+Shift+C → Picker
  - ⌘+N → New Color / ⌘+Shift+N → Folder / ⌘+C → Copy / ⌘+Z → Undo

### 2.4 DATA RULE（絶対不変）
- **保存形式:** HEX (#RRGGBB), Alpha (0–1), CMYK only
- **禁止:** RGB保存, HSL保存
- **Colors Table:** id, user_id, folder_id, hex, alpha, c/m/y/k, name, memo, order, timestamps
- **Behavior Rules:** 同一HEXは上書き / copy時のみ used_count +1 / IndexedDB history max 50

### 2.5 FOLDER SYSTEM
- parent_id によるツリー構造 / drag reorder可 / lock対応

---

## 3. IMPLEMENTATION LAYER（技術制約）

### 3.1 STACK
- Electron（Mac） / React + TypeScript / PWA（iPhone）
- Supabase（DB/Auth） / IndexedDB（local cache）
- Tailwind CSS / Framer Motion

### 3.2 DATA SYNC MODEL
- Supabase = source of truth / IndexedDB = local cache
- offline → auto sync on reconnect

### 3.3 SECURITY
- RLS必須（user_id = auth.uid）
- 招待コード制（beta system）

### 3.4 RENDER RULE
- GPU依存禁止（優先CPU安定） / 非Retina互換 / 1px構造維持必須

---

## 4. SUCCESS CRITERIA（OS VALIDATION）
以下すべて成立時のみ成功：
- 1000回操作でも疲労増加なし
- 深夜状態でも誤操作なし
- UIがノイズ化しない
- CPU高負荷でも破綻しない
- 視線移動が増えない
- 非Retinaでも構造維持

---

## 5. SYSTEM PHILOSOPHY
.blueはUIではない。これは：
- 認知圧縮OS / 身体記憶拡張装置 / 色彩操作カーネル / 長時間作業耐性システム

---

## FINAL STATEMENT
美しさは目的ではない。
操作速度の副作用としてのみ発生する。
