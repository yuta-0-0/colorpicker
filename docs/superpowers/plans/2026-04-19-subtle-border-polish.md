# Subtle Border Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lower the opacity of all structural borders across the UI so dividers become barely perceptible "shadows" rather than visible lines, eliminating visual noise without touching layout, spacing, text, or backdrop-blur.

**Architecture:** Pure Tailwind class opacity-modifier changes. Every `border-border` (unmodified, = 100% white/black) becomes `border-border/10–/20` depending on context (structural dividers get lower, functional UI controls get slightly higher). No CSS variable changes, no layout changes. Three task groups by UI area: right panel → sidebar → main container.

**Tech Stack:** Tailwind CSS opacity modifiers (`/N`), React TSX, no new dependencies

---

## File Map

| Status | Path | Change |
|--------|------|--------|
| Modify | `src/components/detail/DetailPanel.tsx` | Format row dividers `/50 → /10`; HEX input `/bare → /20` |
| Modify | `src/components/detail/ContrastChecker.tsx` | Input + toggle button borders `/bare → /15–/20` |
| Modify | `src/components/detail/ColorPreviewCard.tsx` | Slot badge passive border `/bare → /15` |
| Modify | `src/components/sidebar/Sidebar.tsx` | Active ring `/15 → /6`; hover border `/25 → /10`; dock divider `/6 → /4` |
| Modify | `src/components/views/ListView.tsx` | Placeholder ring `/bare → /12` (2 occurrences) |
| Modify | `src/components/views/GalleryView.tsx` | Placeholder ring `/bare → /12` |
| Modify | `src/components/color/ContextualPanel.tsx` | Section divider `/30 → /8` |
| Modify | `src/components/trash/TrashView.tsx` | Header bottom border `/bare → /10` |

---

## Opacity Scale Reference

| Context | Before | After | Reason |
|---------|--------|-------|--------|
| Structural section divider | `/30` | `/8` | Hairline shadow only |
| Row-level divider | `/50` | `/10` | Barely-there separation |
| Structural header separator | bare (100%) | `/10` | Match row dividers |
| Placeholder ring (list/gallery) | bare (100%) | `/12` | Ghost indicator, not bold ring |
| Sidebar active item ring | `/15` | `/6` | LED glow already shows active state |
| Sidebar hover border | `/25` | `/10` | Subtle response |
| Sidebar dock top border | `/6` | `/4` | Almost invisible seam |
| Input field border | bare (100%) | `/20` | Still legible, less stark |
| Toggle button passive border | bare (100%) | `/15` | Readable at a glance |

---

## Task 1: Right Panel — DetailPanel, ContrastChecker, ColorPreviewCard

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`
- Modify: `src/components/detail/ContrastChecker.tsx`
- Modify: `src/components/detail/ColorPreviewCard.tsx`

- [ ] **Step 1: Fix `DetailPanel.tsx` — all border targets**

Open `src/components/detail/DetailPanel.tsx`. There are 5 changes total.

**Change 1 — Line 95:** Color format row bottom border (HEX / RGB / HSL / CMYK rows)
```tsx
// Before
<div className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">

// After
<div className="flex items-center gap-2 py-1.5 border-b border-border/10 last:border-0">
```

**Change 2 — Lines 313–314:** Background mode preview toggle buttons (dark/light circle buttons)
```tsx
// Before
bgMode === 'dark' ? 'border-accent scale-110' : 'border-border'
bgMode === 'light' ? 'border-accent scale-110' : 'border-border'

// After
bgMode === 'dark' ? 'border-accent scale-110' : 'border-border/15'
bgMode === 'light' ? 'border-accent scale-110' : 'border-border/15'
```
(Both lines have the same pattern — apply the same change to each.)

**Change 3 — Line 483:** HEX edit input border
```tsx
// Before
isValidHex ? 'border-border focus:border-accent' : 'border-red-500/60',

// After
isValidHex ? 'border-border/20 focus:border-accent' : 'border-red-500/60',
```

**Change 4 — Line 567:** CMYK individual input fields border
```tsx
// Before (the full className string for the CMYK input)
className="w-full text-center text-xs font-mono bg-surface-overlay border border-border rounded px-1 py-1 text-text-primary focus:outline-none focus:border-accent"

// After
className="w-full text-center text-xs font-mono bg-surface-overlay border border-border/20 rounded px-1 py-1 text-text-primary focus:outline-none focus:border-accent"
```

**Change 5 — Line 656:** Memo textarea border (メモエリア — explicitly in scope)
```tsx
// Before
className="w-full bg-surface-overlay border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"

// After
className="w-full bg-surface-overlay border border-border/20 rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
```

- [ ] **Step 2: Fix `ContrastChecker.tsx` — compare input and weight toggle buttons**

Open `src/components/detail/ContrastChecker.tsx`.

**Change 1 — Line 53:** Compare color input border
```tsx
// Before
isValid ? 'border-border' : 'border-red-500',

// After
isValid ? 'border-border/20' : 'border-red-500',
```

**Change 2 — Line 72:** Text weight toggle button passive state
```tsx
// Before
: 'border-border text-text-muted hover:border-text-muted',

// After
: 'border-border/15 text-text-muted hover:border-text-muted/60',
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
git commit -m "style: soften right panel borders — format rows /50→/10, inputs /bare→/20"
```

---

## Task 2: Left Sidebar — Sidebar.tsx

**Files:**
- Modify: `src/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Fix active item ring and hover border**

Open `src/components/sidebar/Sidebar.tsx`.

**Change 1 — Line 336:** `glassBase` — active item ring (all grid buttons share this base)
```tsx
// Before
'bg-white/5 border border-white/15 shadow-sm backdrop-blur-xl',

// After
'bg-white/5 border border-white/6 shadow-sm backdrop-blur-xl',
```

**Change 2 — Line 347:** `glassDefault` — hover border
```tsx
// Before
'hover:text-text-primary hover:bg-white/10 hover:border-white/25',

// After
'hover:text-text-primary hover:bg-white/10 hover:border-white/10',
```

- [ ] **Step 2: Fix bottom dock divider**

Still in `src/components/sidebar/Sidebar.tsx`.

**Change — Line 536:** Bottom dock top border (separator between nav grid and trash/settings icons)
```tsx
// Before
<div className="flex-shrink-0 flex items-center justify-around py-1.5 border-t border-white/6">

// After
<div className="flex-shrink-0 flex items-center justify-around py-1.5 border-t border-white/4">
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit
```

Expected: No output (0 errors)

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar/Sidebar.tsx
git commit -m "style: soften sidebar borders — active ring /15→/6, hover /25→/10, dock /6→/4"
```

---

## Task 3: Main Container — ListView, GalleryView, ContextualPanel, TrashView

**Files:**
- Modify: `src/components/views/ListView.tsx`
- Modify: `src/components/views/GalleryView.tsx`
- Modify: `src/components/color/ContextualPanel.tsx`
- Modify: `src/components/trash/TrashView.tsx`

- [ ] **Step 1: Fix `ListView.tsx` — placeholder selection ring (2 occurrences)**

Open `src/components/views/ListView.tsx`.

Both occurrences are identical. Use find-replace on the exact string:

**Change — Lines 76 and 217** (same string, replace both):
```tsx
// Before
: 'border border-border text-transparent hover:border-text-muted',

// After
: 'border border-border/12 text-transparent hover:border-text-muted/50',
```

There are exactly 2 occurrences of this string in the file. Replace both.

- [ ] **Step 2: Fix `GalleryView.tsx` — placeholder selection ring**

Open `src/components/views/GalleryView.tsx`.

**Change — Line 44:**
```tsx
// Before
: 'bg-surface-overlay border border-border text-transparent',

// After
: 'bg-surface-overlay border border-border/12 text-transparent',
```

- [ ] **Step 3: Fix `ContextualPanel.tsx` — section divider**

Open `src/components/color/ContextualPanel.tsx`.

**Change — Line 83:**
```tsx
// Before
<div className="mx-3 border-t border-border/30" />

// After
<div className="mx-3 border-t border-border/8" />
```

- [ ] **Step 4: Fix `TrashView.tsx` — header bottom border**

Open `src/components/trash/TrashView.tsx`.

**Change — Line 25:**
```tsx
// Before
<div className="px-4 py-3 border-b border-border flex items-center justify-between">

// After
<div className="px-4 py-3 border-b border-border/10 flex items-center justify-between">
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit
```

Expected: No output (0 errors)

- [ ] **Step 6: Vite build check**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx vite build 2>&1 | grep -E "built|error"
```

Expected: `✓ built in X.XXs` — no errors

- [ ] **Step 7: Commit**

```bash
git add src/components/views/ListView.tsx \
        src/components/views/GalleryView.tsx \
        src/components/color/ContextualPanel.tsx \
        src/components/trash/TrashView.tsx
git commit -m "style: soften main container borders — list/gallery rings /bare→/12, dividers /30→/8"
```

---

## Visual Verification Checklist (after all tasks)

Run `npm run dev:vite` and check the following:

| Area | Before | Expected after |
|------|--------|----------------|
| DetailPanel color code rows (HEX/RGB/HSL) | Bold white separators visible | Lines barely perceptible, spacing feels clean |
| DetailPanel HEX input | Strong white outline ring | Faint border, still visible on focus |
| ContrastChecker weight toggle buttons | Strong white outlines | Ghost outlines, active accent stands out more |
| ColorPreviewCard slot badges | Bold white pill borders | Very subtle ring, accent ring on active slot stands out |
| Sidebar grid buttons | Noticeable white ring on all buttons | Nearly invisible base ring, LED glow dominates active state |
| Sidebar bottom dock divider | Visible top separator line | Hairline seam |
| ListView color item circles (placeholder) | Bold white ring on unselected | Ghost ring |
| GalleryView color circles (placeholder) | Bold white ring | Ghost ring |
| ContextualPanel section divider | Visible horizontal rule | Near-invisible hairline |
| TrashView header divider | Strong bottom border | Subtle seam |

**Constraints check:**
- [ ] No layout shifts (padding/margin unchanged)
- [ ] No text color changes
- [ ] Backdrop-blur effects on Bento panes unchanged
- [ ] Accent-colored borders (active states, focus rings) unaffected
- [ ] Error borders (`border-red-500/60`) unaffected
