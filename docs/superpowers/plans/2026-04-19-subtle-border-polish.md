# Subtle Border Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lower the opacity of all structural borders across the UI (both dark and light mode) so dividers become barely perceptible "shadows" rather than visible lines, eliminating visual noise without touching layout, spacing, text, or backdrop-blur.

**Architecture:** Pure Tailwind class opacity-modifier changes. Hardcoded `border-white/*` in the sidebar is replaced with `border-border/*` (the CSS variable) so dark mode gets white/N and light mode gets black/N automatically. `bg-border` (bare, 100% opacity) vertical dividers are changed to `bg-border/10`. No CSS variable definition changes, no layout changes.

**Tech Stack:** Tailwind CSS opacity modifiers (`/N`), React TSX, no new dependencies

---

## File Map

| Status | Path | Change |
|--------|------|--------|
| Modify | `src/components/detail/DetailPanel.tsx` | Format row dividers `/50→/10`; BG toggle / HEX / CMYK / 特色メモ inputs `/bare→/15–/20` |
| Modify | `src/components/detail/ContrastChecker.tsx` | Color swatches `/bare→/12`; sim container `/6→/4`; input + toggle `/bare→/15–/20` |
| Modify | `src/components/detail/ColorPreviewCard.tsx` | Slot badge passive border `/bare→/15` |
| Modify | `src/components/sidebar/Sidebar.tsx` | `border-white/*` → `border-border/*` (dual-mode fix); ring `/15→/6`; hover `/25→/10`; dock `/6→/4` |
| Modify | `src/components/views/ListView.tsx` | Placeholder ring `/bare→/12` (2 occurrences) |
| Modify | `src/components/views/GalleryView.tsx` | Placeholder ring `/bare→/12` |
| Modify | `src/components/views/FilterBar.tsx` | `bg-border` vertical dividers → `bg-border/10` (2 occurrences) |
| Modify | `src/components/color/ContextualPanel.tsx` | Horizontal divider `/30→/8`; vertical divider `bg-border/30→bg-border/8` |
| Modify | `src/components/generator/GeneratorView.tsx` | Seed color section divider `/40→/10` |
| Modify | `src/components/trash/TrashView.tsx` | Header bottom border `/bare→/10` |

---

## Opacity Scale Reference

| Context | Before | After | Reason |
|---------|--------|-------|--------|
| Structural section / row divider | `/30`–`/50` | `/8`–`/10` | Hairline shadow only |
| Structural header separator | bare (100%) | `/10` | Match row dividers |
| `bg-border` vertical 1px divider | bare (100%) | `/10` | FilterBar inline separators |
| Color swatch ring (preview circles) | bare (100%) | `/12` | Ghost ring, color fill is the signal |
| Placeholder ring (list/gallery) | bare (100%) | `/12` | Ghost indicator, not bold ring |
| Sidebar item ring (all buttons) | `/15` white | `/6` border-var | Dual-mode; LED glow is the active signal |
| Sidebar hover border | `/25` white | `/10` border-var | Dual-mode; subtle response |
| Sidebar dock top border | `/6` white | `/4` border-var | Dual-mode; near-invisible seam |
| Input field border | bare (100%) | `/20` | Still legible for affordance |
| Toggle button passive border | bare (100%) | `/15` | Readable at a glance |
| Color vision sim container | `/6` | `/4` | Already subtle → one step lower |

---

## Task 1: Right Panel — DetailPanel, ContrastChecker, ColorPreviewCard

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`
- Modify: `src/components/detail/ContrastChecker.tsx`
- Modify: `src/components/detail/ColorPreviewCard.tsx`

- [ ] **Step 1: Fix `DetailPanel.tsx` — all 5 border targets**

Open `src/components/detail/DetailPanel.tsx`.

**Change 1 — Line 95:** Color format row bottom border (HEX / RGB / HSL / CMYK rows)
```tsx
// Before
<div className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">

// After
<div className="flex items-center gap-2 py-1.5 border-b border-border/10 last:border-0">
```

**Change 2 — Lines 313–314:** BG mode preview toggle buttons (dark/light circle buttons, 2 lines with same pattern)
```tsx
// Before (line 313)
bgMode === 'dark' ? 'border-accent scale-110' : 'border-border'
// Before (line 314)
bgMode === 'light' ? 'border-accent scale-110' : 'border-border'

// After (line 313)
bgMode === 'dark' ? 'border-accent scale-110' : 'border-border/15'
// After (line 314)
bgMode === 'light' ? 'border-accent scale-110' : 'border-border/15'
```

**Change 3 — Line 483:** HEX edit input border
```tsx
// Before
isValidHex ? 'border-border focus:border-accent' : 'border-red-500/60',

// After
isValidHex ? 'border-border/20 focus:border-accent' : 'border-red-500/60',
```

**Change 4 — Line 567:** CMYK individual input fields border
```tsx
// Before
className="w-full text-center text-xs font-mono bg-surface-overlay border border-border rounded px-1 py-1 text-text-primary focus:outline-none focus:border-accent"

// After
className="w-full text-center text-xs font-mono bg-surface-overlay border border-border/20 rounded px-1 py-1 text-text-primary focus:outline-none focus:border-accent"
```

**Change 5 — Line 656:** 特色メモ input border
```tsx
// Before
className="w-full bg-surface-overlay border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"

// After
className="w-full bg-surface-overlay border border-border/20 rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
```

- [ ] **Step 2: Fix `ContrastChecker.tsx` — color swatches, sim container, input, toggle buttons**

Open `src/components/detail/ContrastChecker.tsx`.

**Change 1 — Line 43:** Compare color preview swatch ring
```tsx
// Before
className="w-6 h-6 rounded-full border border-border flex-shrink-0"

// After
className="w-6 h-6 rounded-full border border-border/12 flex-shrink-0"
```

**Change 2 — Line 53:** Compare color input border
```tsx
// Before
isValid ? 'border-border' : 'border-red-500',

// After
isValid ? 'border-border/20' : 'border-red-500',
```

**Change 3 — Line 72:** Text weight toggle button passive state
```tsx
// Before
: 'border-border text-text-muted hover:border-text-muted',

// After
: 'border-border/15 text-text-muted hover:border-text-muted/60',
```

**Change 4 — Line 128:** Suggested text color preview swatch ring
```tsx
// Before
className="w-4 h-4 rounded-full border border-border"

// After
className="w-4 h-4 rounded-full border border-border/12"
```

**Change 5 — Line 139:** Color vision simulation section container border
```tsx
// Before
<div className="rounded-lg p-3 space-y-2 bg-transparent border border-white/6">

// After
<div className="rounded-lg p-3 space-y-2 bg-transparent border border-border/4">
```
(Also changes `border-white/6` → `border-border/4` for dual-mode support.)

**Change 6 — Line 145:** Each color vision simulation swatch ring
```tsx
// Before
className="w-5 h-5 rounded-full border border-border flex-shrink-0"

// After
className="w-5 h-5 rounded-full border border-border/12 flex-shrink-0"
```

- [ ] **Step 3: Fix `ColorPreviewCard.tsx` — slot badge passive border**

Open `src/components/detail/ColorPreviewCard.tsx`.

**Change — Line 115:** Slot badge passive state (non-active badge border)
```tsx
// Before
: 'border-border text-text-secondary hover:border-text-muted',

// After
: 'border-border/15 text-text-secondary hover:border-text-muted/60',
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit
```

Expected: No output (0 errors)

- [ ] **Step 5: Commit**

```bash
git add src/components/detail/DetailPanel.tsx \
        src/components/detail/ContrastChecker.tsx \
        src/components/detail/ColorPreviewCard.tsx
git commit -m "style: soften right panel borders — format rows, inputs, swatches, sim container"
```

---

## Task 2: Left Sidebar — Sidebar.tsx

**Files:**
- Modify: `src/components/sidebar/Sidebar.tsx`

**Important:** All `border-white/*` values are replaced with `border-border/*` (the CSS variable). This ensures:
- Dark mode: `border-border/N` = white/N (same visual result as before, but lower opacity)
- Light mode: `border-border/N` = black/N (correct dark lines on light sidebar background)

- [ ] **Step 1: Fix active item ring — `glassBase` (Line 336)**

Open `src/components/sidebar/Sidebar.tsx`.

```tsx
// Before
'bg-white/5 border border-white/15 shadow-sm backdrop-blur-xl',

// After
'bg-white/5 border border-border/6 shadow-sm backdrop-blur-xl',
```

- [ ] **Step 2: Fix hover border — `glassDefault` (Line 347)**

```tsx
// Before
'hover:text-text-primary hover:bg-white/10 hover:border-white/25',

// After
'hover:text-text-primary hover:bg-white/10 hover:border-border/10',
```

- [ ] **Step 3: Fix bottom dock top border (Line 536)**

```tsx
// Before
<div className="flex-shrink-0 flex items-center justify-around py-1.5 border-t border-white/6">

// After
<div className="flex-shrink-0 flex items-center justify-around py-1.5 border-t border-border/4">
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit
```

Expected: No output (0 errors)

- [ ] **Step 5: Commit**

```bash
git add src/components/sidebar/Sidebar.tsx
git commit -m "style: soften sidebar borders, switch white→border-var for dual-mode support"
```

---

## Task 3: Main Container — ListView, GalleryView, FilterBar, ContextualPanel, GeneratorView, TrashView

**Files:**
- Modify: `src/components/views/ListView.tsx`
- Modify: `src/components/views/GalleryView.tsx`
- Modify: `src/components/views/FilterBar.tsx`
- Modify: `src/components/color/ContextualPanel.tsx`
- Modify: `src/components/generator/GeneratorView.tsx`
- Modify: `src/components/trash/TrashView.tsx`

- [ ] **Step 1: Fix `ListView.tsx` — placeholder selection ring (2 occurrences)**

Open `src/components/views/ListView.tsx`.

Both occurrences are the identical string. Use find-replace-all:

```tsx
// Before (lines 76 and 217 — identical string, replace both)
: 'border border-border text-transparent hover:border-text-muted',

// After
: 'border border-border/12 text-transparent hover:border-text-muted/50',
```

Verify: exactly 2 occurrences exist in the file.

- [ ] **Step 2: Fix `GalleryView.tsx` — placeholder selection ring**

Open `src/components/views/GalleryView.tsx`.

```tsx
// Before — Line 44
: 'bg-surface-overlay border border-border text-transparent',

// After
: 'bg-surface-overlay border border-border/12 text-transparent',
```

- [ ] **Step 3: Fix `FilterBar.tsx` — `bg-border` vertical inline dividers (2 occurrences)**

Open `src/components/views/FilterBar.tsx`.

These are 1px-wide `<div>` elements used as vertical separators between filter sections. `bg-border` bare = 100% white/black = too stark.

```tsx
// Before — Line 80
<div className="w-px h-3 bg-border flex-shrink-0 mx-0.5" />

// After
<div className="w-px h-3 bg-border/10 flex-shrink-0 mx-0.5" />
```

```tsx
// Before — Line 134
<div className="w-px h-3 bg-border mx-0.5" />

// After
<div className="w-px h-3 bg-border/10 mx-0.5" />
```

- [ ] **Step 4: Fix `ContextualPanel.tsx` — horizontal and vertical dividers**

Open `src/components/color/ContextualPanel.tsx`.

**Change 1 — Line 83:** Horizontal section divider (between top and contextual content)
```tsx
// Before
<div className="mx-3 border-t border-border/30" />

// After
<div className="mx-3 border-t border-border/8" />
```

**Change 2 — Line 106:** Vertical 1px divider (inside color info area)
```tsx
// Before
<div className="w-px bg-border/30 flex-shrink-0 my-3" />

// After
<div className="w-px bg-border/8 flex-shrink-0 my-3" />
```

- [ ] **Step 5: Fix `GeneratorView.tsx` — seed color section divider**

Open `src/components/generator/GeneratorView.tsx`.

```tsx
// Before — Line 234
<div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">

// After
<div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/10">
```

- [ ] **Step 6: Fix `TrashView.tsx` — header bottom border**

Open `src/components/trash/TrashView.tsx`.

```tsx
// Before — Line 25
<div className="px-4 py-3 border-b border-border flex items-center justify-between">

// After
<div className="px-4 py-3 border-b border-border/10 flex items-center justify-between">
```

- [ ] **Step 7: TypeScript check**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit
```

Expected: No output (0 errors)

- [ ] **Step 8: Vite build check**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx vite build 2>&1 | grep -E "built|error"
```

Expected: `✓ built in X.XXs` — no errors

- [ ] **Step 9: Commit**

```bash
git add src/components/views/ListView.tsx \
        src/components/views/GalleryView.tsx \
        src/components/views/FilterBar.tsx \
        src/components/color/ContextualPanel.tsx \
        src/components/generator/GeneratorView.tsx \
        src/components/trash/TrashView.tsx
git commit -m "style: soften main container borders — list/gallery/filterbar/generator/trash"
```

---

## Visual Verification Checklist (after all tasks)

Run `npm run dev:vite` and verify in **both dark and light mode**:

| Area | Expected (dark) | Expected (light) |
|------|----------------|-----------------|
| DetailPanel format rows (HEX/RGB/HSL) | Near-invisible white hairlines | Near-invisible dark hairlines |
| DetailPanel BG toggle buttons | Ghost ring (non-selected) | Ghost ring (non-selected) |
| DetailPanel inputs (HEX / CMYK / 特色メモ) | Very faint outline, accent on focus | Very faint outline, accent on focus |
| ContrastChecker color swatches | Ghost ring around each swatch | Ghost ring around each swatch |
| ContrastChecker toggle buttons | Barely visible pill borders | Barely visible pill borders |
| Color vision sim container | Nearly invisible border | Nearly invisible border |
| ColorPreviewCard slot badges | Ghost pill, accent ring stands out | Ghost pill, accent ring stands out |
| Sidebar grid buttons | Invisible ring at rest; LED glow on active | Invisible ring at rest |
| Sidebar bottom dock divider | Near-invisible top seam | Near-invisible top seam |
| ListView placeholder rings | Ghost circle | Ghost circle |
| GalleryView placeholder rings | Ghost circle | Ghost circle |
| FilterBar vertical separators | Barely visible 1px lines | Barely visible 1px lines |
| ContextualPanel dividers | Hairline rules | Hairline rules |
| GeneratorView seed color divider | Ghost top border | Ghost top border |
| TrashView header divider | Near-invisible bottom line | Near-invisible bottom line |

**Constraints check:**
- [ ] No layout shifts (padding/margin unchanged)
- [ ] No text color changes
- [ ] Backdrop-blur effects on Bento panes unchanged
- [ ] Accent-colored borders (active states, focus rings `focus:border-accent`) unaffected
- [ ] Error/warning borders (`border-red-500`, `border-yellow-500`) unaffected
- [ ] Inline style color-derived borders (e.g. `rgba(${r},${g},${b},0.3)`) unaffected
