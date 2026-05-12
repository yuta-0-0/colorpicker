# Phase 6.3 Ultimate UI Refinement — Glass Concentric Radius Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve macOS-style concentric-radius glass container hierarchy, eliminate all drop shadows in favor of elevation+border, and add properly styled メモ/タグ input fields to DetailPanel.

**Architecture:** Three-layer radius hierarchy — outer glass frame (40px) → bento panes (30px) → inner inputs (6px/rounded-md). Shadows fully removed; depth expressed via backdrop-filter + border + CSS variable elevation gaps. DetailPanel gains memo textarea and TagInput with field wrapper styling.

**Tech Stack:** React + TypeScript, Tailwind CSS (arbitrary values `rounded-[Xpx]`), CSS custom properties, Framer Motion

---

## File Map

| File | Change |
|------|--------|
| `src/components/layout/AppLayout.tsx` | Root div add `rounded-[2.5rem]`; motion.div wrappers `rounded-[30px]` |
| `src/index.css` | `.bento-pane`/`.bento-pane-neutral` radius `→30px`; remove all `box-shadow`; add `border` |
| `src/components/detail/DetailPanel.tsx` | Add memo state+handler+section; import+add TagInput section; update 特色メモ radius |
| `src/components/color/TagInput.tsx` | Input wrapper added in DetailPanel — no direct changes needed |

---

## Task 1: Outer glass frame + concentric radii

**Files:**
- Modify: `src/components/layout/AppLayout.tsx` (lines 348, 383, 483)
- Modify: `src/index.css` (`.bento-pane` lines 186–196, `.bento-pane-neutral` lines 209–218)

### Radius math
```
Outer frame:  40px (2.5rem)   — root h-screen div
Padding gap:  10px             — style={{ padding: '10px' }}
Inner panes:  30px             — 40 - 10 = 30 (concentric law)
```

- [ ] **Step 1: Add outer frame radius to root div**

In `src/components/layout/AppLayout.tsx`, line ~348, the root div:
```tsx
// BEFORE
<div className="relative h-screen overflow-hidden text-text-primary">

// AFTER
<div className="relative h-screen overflow-hidden rounded-[2.5rem] text-text-primary">
```
`overflow-hidden` is already present — it clips content to the 40px rounded shape.

- [ ] **Step 2: Update motion.div wrapper radii to 30px**

In `src/components/layout/AppLayout.tsx`, both `motion.div` wrappers currently have `rounded-[2rem]` (32px). Change to `rounded-[30px]`. Both share the same class string, so use `replace_all: true`:

```tsx
// BEFORE (2 occurrences)
className="flex-shrink-0 overflow-hidden rounded-[2rem]"

// AFTER (2 occurrences)
className="flex-shrink-0 overflow-hidden rounded-[30px]"
```

- [ ] **Step 3: Update bento pane CSS radius to 30px**

In `src/index.css`, update both `.bento-pane` and `.bento-pane-neutral`:

`.bento-pane`:
```css
/* BEFORE */
border-radius: 2rem;

/* AFTER */
border-radius: 30px;
```

`.bento-pane-neutral`:
```css
/* BEFORE */
border-radius: 2rem;

/* AFTER */
border-radius: 30px;
```

- [ ] **Step 4: Verify concentric alignment visually**

Run the dev server with `npm run dev` and check that:
- The outermost window frame corners curve at 40px
- The sidebar/main/detail panel corners curve at ~30px
- The corner "gap" between outer and inner appears equal on all sides (~10px of visible background through the gap)

- [ ] **Step 5: Commit**
```bash
git add src/components/layout/AppLayout.tsx src/index.css
git commit -m "feat(phase6.3): outer glass frame 40px, bento panes 30px (concentric)"
```

---

## Task 2: Complete shadow removal + whisper border

**Files:**
- Modify: `src/index.css` (all 4 bento shadow blocks)

The current `.bento-pane` is inside `motion.div(overflow-hidden)`, meaning any `box-shadow` is already clipped and invisible. `.bento-pane-neutral` is in a flex container with `overflow-hidden` which also clips it. This task removes the dead code and replaces the `0 0 0 0.5px` hairline ring with an explicit `border` declaration. Depth is maintained by backdrop-filter + Phase 6.2 elevation CSS variables.

- [ ] **Step 1: Replace dark .bento-pane shadow with border**

In `src/index.css`, replace the full `.bento-pane` block:

```css
/* BEFORE */
.bento-pane {
  background: rgba(11, 16, 26, 0.80);         /* #0B101A 80% — 深い青み黒 */
  backdrop-filter: blur(40px) saturate(200%);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  border-radius: 30px;
  overflow: hidden;
  box-shadow:
    0 0 0 0.5px rgba(255,255,255,0.03),
    0 4px 16px rgba(0,0,0,0.18),
    0 1px 3px rgba(0,0,0,0.10);
}

/* AFTER */
.bento-pane {
  background: rgba(11, 16, 26, 0.80);         /* #0B101A 80% — 深い青み黒 */
  backdrop-filter: blur(40px) saturate(200%);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  border-radius: 30px;
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
```

- [ ] **Step 2: Replace dark .bento-pane-neutral shadow with border**

```css
/* BEFORE */
.bento-pane-neutral {
  background: #1C1C1C;                         /* 完全無彩色ダーク — 青みゼロ */
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: 30px;
  overflow: hidden;
  box-shadow:
    0 0 0 0.5px rgba(255,255,255,0.02),
    0 4px 16px rgba(0,0,0,0.18),
    0 1px 3px rgba(0,0,0,0.10);
}

/* AFTER */
.bento-pane-neutral {
  background: #1C1C1C;                         /* 完全無彩色ダーク — 青みゼロ */
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: 30px;
  border: 0.5px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
```

- [ ] **Step 3: Replace light .bento-pane shadow with border**

```css
/* BEFORE */
[data-theme="light"] .bento-pane {
  background: rgba(240, 244, 248, 0.80);       /* #F0F4F8 80% — 青みのある白 */
  box-shadow:
    0 0 0 0.5px rgba(0,0,0,0.03),
    0 4px 16px rgba(0,0,0,0.06),
    0 1px 3px rgba(0,0,0,0.03),
    inset 0 1px 0 rgba(255,255,255,0.5);
}

/* AFTER */
[data-theme="light"] .bento-pane {
  background: rgba(240, 244, 248, 0.80);       /* #F0F4F8 80% — 青みのある白 */
  border: 0.5px solid rgba(0, 0, 0, 0.06);
}
```

- [ ] **Step 4: Replace light .bento-pane-neutral shadow with border**

```css
/* BEFORE */
[data-theme="light"] .bento-pane-neutral {
  background: #F1F3F5;                         /* クールグレーライト — 黄ばみ防止 */
  box-shadow:
    0 0 0 0.5px rgba(0,0,0,0.03),
    0 4px 16px rgba(0,0,0,0.05),
    0 1px 3px rgba(0,0,0,0.02);
}

/* AFTER */
[data-theme="light"] .bento-pane-neutral {
  background: #F1F3F5;                         /* クールグレーライト — 黄ばみ防止 */
  border: 0.5px solid rgba(0, 0, 0, 0.05);
}
```

- [ ] **Step 5: Commit**
```bash
git add src/index.css
git commit -m "refine(phase6.3): replace bento box-shadow with 0.5px border; shadows removed"
```

---

## Task 3: DetailPanel — メモ + タグ sections

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`

Currently the DetailPanel scrollable section ends at 特色メモ (line ~641). Neither 一言メモ (memo textarea) nor タグ (TagInput) exist in the panel, though `color.memo` exists in the data model and `TagInput` is a complete component. This task adds both before 特色メモ, with proper field wrapper styling.

**Field wrapper pattern** (used for both memo and tag):
```tsx
<div className="bg-surface-raised border border-border/15 rounded-md px-2.5 py-2 hover:border-border/30 focus-within:border-accent/40 transition-colors">
  {/* inner content */}
</div>
```

- [ ] **Step 1: Add TagInput import**

Near the top of `src/components/detail/DetailPanel.tsx`, after the existing imports (around line 17), add:
```tsx
import { TagInput } from '@/components/color/TagInput'
```

- [ ] **Step 2: Add memo state, sync effect, and handler**

In the component body, after the `spotColorValue` state declaration (line ~165) and its sync effect (line ~218), add matching patterns for memo:

After line 165 (`const [spotColorValue, ...]`):
```tsx
const [memoValue, setMemoValue] = useState(color?.memo ?? '')
```

After line 220 (`}, [color?.id])`):
```tsx
// color が変わったら memo を同期
useEffect(() => {
  setMemoValue(color?.memo ?? '')
}, [color?.id])
```

After line 186 (`const handleSpotColorSubmit = ...`):
```tsx
const handleMemoSubmit = () => {
  if (!color) return
  updateColor(color.id, { memo: memoValue.trim() || null })
}
```

- [ ] **Step 3: Add メモ section before 特色メモ**

In the scrollable section, insert immediately before the `{/* 特色メモ（常時表示入力欄） */}` block (line ~641):

```tsx
{/* 一言メモ */}
<div>
  <p className="text-xs text-text-muted mb-1">メモ</p>
  <div className="bg-surface-raised border border-border/15 rounded-md px-2.5 py-2 hover:border-border/30 focus-within:border-accent/40 transition-colors">
    <textarea
      value={memoValue}
      onChange={(e) => { if (!color.is_locked) setMemoValue(e.target.value) }}
      onBlur={handleMemoSubmit}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return
        if (e.key === 'Escape') setMemoValue(color.memo ?? '')
      }}
      disabled={color.is_locked}
      placeholder="一言メモを追加..."
      rows={2}
      className="w-full bg-transparent text-xs text-text-primary resize-none focus:outline-none placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
</div>
```

- [ ] **Step 4: Add タグ section after メモ section (before 特色メモ)**

Insert after the メモ section, still before `{/* 特色メモ */}`:

```tsx
{/* タグ */}
<div>
  <p className="text-xs text-text-muted mb-1">タグ</p>
  <div className="bg-surface-raised border border-border/15 rounded-md px-2.5 py-2 hover:border-border/30 focus-within:border-accent/40 transition-colors">
    <TagInput colorId={color.id} isLocked={color.is_locked} />
  </div>
</div>
```

- [ ] **Step 5: Update 特色メモ input to rounded-md**

In the existing 特色メモ input (line ~656):
```tsx
// BEFORE
className="w-full bg-surface-overlay border border-border/20 rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"

// AFTER
className="w-full bg-surface-overlay border border-border/15 rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none hover:border-border/30 focus:border-accent/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
```
(Changes: `rounded-lg` → `rounded-md`, `border-border/20` → `border-border/15`, adds `hover:border-border/30 focus:border-accent/40` — consistent with new field wrapper pattern)

- [ ] **Step 6: Verify DetailPanel renders correctly**

Run dev server and open DetailPanel on any color. Check:
- メモ textarea visible with bg + border, edits save on blur
- タグ section shows tag pills + input, dropdown works
- 特色メモ field consistent with メモ styling
- Hover state: border brightens on all 3 fields
- Focus state: blue accent border appears

- [ ] **Step 7: Commit**
```bash
git add src/components/detail/DetailPanel.tsx
git commit -m "feat(phase6.3): add memo textarea + tag section to DetailPanel with field wrapper styling"
```

---

## Self-Review

**Spec coverage check:**

1. ✅ **一番外側のガラスコンテナ角丸拡張**: root div `rounded-[2.5rem]` (40px) — Task 1
2. ✅ **Concentric radius**: 40px outer → 30px inner panes → `rounded-md` (6px) inputs — Task 1 + existing Phase 6.2
3. ✅ **影の完全除去（Dark + Light両モード）**: All 4 bento `box-shadow` blocks removed — Task 2
4. ✅ **Core inputs rounded-md**: メモ/タグ wrapper `rounded-md`, 特色メモ `rounded-md` — Task 3
5. ✅ **メモ + タグ エリア再設計**: Field wrapper with bg + border + hover/focus states — Task 3

**Placeholder scan:** No TBD or TODO. All code blocks complete.

**Type consistency:** `updateColor(color.id, { memo: ... })` matches `ColorUpdate` type (string | null field). `TagInput` interface `{ colorId: string; isLocked: boolean }` matches usage.
