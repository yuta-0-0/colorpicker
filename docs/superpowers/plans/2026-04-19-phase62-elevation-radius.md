# Phase 6.2 Dark Mode Elevation & Radius Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase dark mode surface elevation contrast for macOS-like depth perception, and unify border-radius to a strict outer→inner→core concentric hierarchy throughout the app.

**Architecture:** Two independent pillars. (1) Elevation: widen the RGB gap between `--color-surface-raised` and `--color-surface-overlay` CSS vars in `:root` (dark default) so mid-level and foreground surfaces read as clearly distinct layers. Sync matching hardcoded `rgba()` values in `index.css` and `BulkActionBar.tsx`. Text-primary softened from pure white to off-white. (2) Radius: upgrade the outer Bento containers from `rounded-2xl` (16px) to `rounded-3xl` (24px) to match the correct concentric math (24px → 12px → 6px), then systematically replace bare `rounded` (4px) with `rounded-md` (6px) on all inputs and action buttons across 7 component files.

**Tech Stack:** Tailwind CSS, React TSX, CSS custom properties — no new dependencies

---

## Self-Diagnosis: CSS Variable Status

The app uses CSS custom properties (`--color-surface`, `--color-surface-raised`, etc.) mapped to Tailwind via `tailwind.config.ts`. Colors are **not hardcoded** in component files (they use `bg-surface`, `bg-surface-raised`, `bg-surface-overlay` utility classes). The `:root` block is the dark-mode default; `[data-theme="light"]` overrides light mode. **Conclusion:** Apply the elevation rule directly to the `:root` CSS variables.

---

## Opacity Scale / Elevation Reference

| Layer | CSS Variable | Current RGB | New RGB | Notes |
|-------|-------------|-------------|---------|-------|
| Base | `--color-surface` | `11 16 26` | `11 16 26` | Unchanged — serves as darkest base |
| Surface 1 | `--color-surface-raised` | `15 21 36` | `22 30 48` | +7,+9,+12 — list items, sidebar active |
| Surface 2 | `--color-surface-overlay` | `20 27 46` | `32 44 68` | +10,+14,+20 — input fields, code cards |
| Text Primary | `--color-text-primary` | `255 255 255` | `235 239 248` | Off-white, slight blue tint |

Hardcoded rgba values that reference these surfaces (must be synced):

| Location | Before | After |
|----------|--------|-------|
| `index.css` `.list-item:hover` | `rgba(20, 27, 46, 0.50)` | `rgba(32, 44, 68, 0.50)` |
| `index.css` `.list-item-active` | `rgba(15, 21, 36, 0.70)` | `rgba(22, 30, 48, 0.70)` |
| `BulkActionBar.tsx` main bar | `rgba(15, 21, 36, 0.92)` | `rgba(22, 30, 48, 0.92)` |

**Not touched:** `.bento-pane` and `.glass-popup` use `rgba(11, 16, 26, ...)` which is `--color-surface` (unchanged). Light mode values in `[data-theme="light"]` are not touched.

---

## Radius Hierarchy

| Level | Applies to | Class | px |
|-------|-----------|-------|----|
| Outer | Bento container motion.div + `.bento-pane` CSS | `rounded-3xl` / `1.5rem` | 24 |
| Inner | Panels, list items, section cards | `rounded-xl` / `rounded-lg` | 12 / 8 |
| Core | Inputs, small action buttons, status rows | `rounded-md` | 6 |

---

## File Map

| Status | Path | Change |
|--------|------|--------|
| Modify | `src/index.css` | CSS vars elevation + text-primary + 2 rgba syncs + bento radius |
| Modify | `src/components/layout/AppLayout.tsx` | 2× `rounded-2xl` → `rounded-3xl` |
| Modify | `src/components/ui/BulkActionBar.tsx` | 1 rgba sync |
| Modify | `src/components/detail/DetailPanel.tsx` | 10× `rounded` → `rounded-md` |
| Modify | `src/components/sidebar/Sidebar.tsx` | 3× `rounded` → `rounded-md` |
| Modify | `src/components/views/FilterBar.tsx` | 5× `rounded` → `rounded-md` |
| Modify | `src/components/generator/GeneratorView.tsx` | 7× `rounded` → `rounded-md` |
| Modify | `src/components/trash/TrashView.tsx` | 2× `rounded` → `rounded-md` |
| Modify | `src/components/detail/ColorPreviewCard.tsx` | 1× `rounded` → `rounded-md` |

---

## Task 1: Elevation, Text Contrast & Bento Radius Foundation

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/components/ui/BulkActionBar.tsx`

- [ ] **Step 1: Update dark-mode CSS variables in `src/index.css`**

Locate the `:root` block (lines 15–35). Make 4 changes:

```css
/* Before */
--color-surface-raised:   15 21 36;      /* #0F1524 */
--color-surface-overlay:  20 27 46;      /* #141B2E */
--color-text-primary:     255 255 255;

/* After */
--color-surface-raised:   22 30 48;      /* #161E30 — +7,+9,+12 elevation step */
--color-surface-overlay:  32 44 68;      /* #202C44 — +10,+14,+20 elevation step */
--color-text-primary:     235 239 248;   /* #EBEFF8 — off-white, reduces eye strain */
```

`--color-surface` (11 16 26) stays unchanged — it is the darkest base.
`--color-surface-sidebar` stays unchanged (same as surface, sidebar has own glass effect).
The `[data-theme="light"]` block is untouched.

- [ ] **Step 2: Sync hardcoded rgba values in `src/index.css`**

Two places use hardcoded rgba that reference the old surface-raised/overlay values:

```css
/* Before — list-item:hover (references surface-overlay) */
background: rgba(20, 27, 46, 0.50);   /* --color-surface-overlay dark */

/* After */
background: rgba(32, 44, 68, 0.50);   /* --color-surface-overlay dark */
```

```css
/* Before — list-item-active (references surface-raised) */
background: rgba(15, 21, 36, 0.70);   /* --color-surface-raised dark */

/* After */
background: rgba(22, 30, 48, 0.70);   /* --color-surface-raised dark */
```

**Note:** `.bento-pane { background: rgba(11, 16, 26, 0.80); }` references surface (unchanged) — do not edit.
`[data-theme="light"]` rgba values are not touched.

- [ ] **Step 3: Upgrade Bento container radius in `src/index.css`**

Two CSS classes use `border-radius: 1rem`. Change both to `1.5rem`:

```css
/* Before */
.bento-pane {
  border-radius: 1rem;
  ...
}

/* After */
.bento-pane {
  border-radius: 1.5rem;
  ...
}
```

```css
/* Before */
.bento-pane-neutral {
  border-radius: 1rem;
  ...
}

/* After */
.bento-pane-neutral {
  border-radius: 1.5rem;
  ...
}
```

- [ ] **Step 4: Upgrade outer motion.div clip radius in `src/components/layout/AppLayout.tsx`**

Two `motion.div` wrappers clip the bento panes. Their radius must match or exceed the `.bento-pane` radius to avoid clipping corners.

**Sidebar wrapper (around line 382):**
```tsx
/* Before */
<motion.div
  className="flex-shrink-0 overflow-hidden rounded-2xl"
  ...

/* After */
<motion.div
  className="flex-shrink-0 overflow-hidden rounded-3xl"
  ...
```

**Detail panel wrapper (around line 482):**
```tsx
/* Before */
<motion.div
  className="flex-shrink-0 overflow-hidden rounded-2xl"
  ...

/* After */
<motion.div
  className="flex-shrink-0 overflow-hidden rounded-3xl"
  ...
```

- [ ] **Step 5: Sync BulkActionBar background in `src/components/ui/BulkActionBar.tsx`**

The floating action bar uses a hardcoded inline style that matches surface-raised:

```tsx
/* Before (around line 58) */
background: 'rgba(15, 21, 36, 0.92)',

/* After */
background: 'rgba(22, 30, 48, 0.92)',
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit
```

Expected: No output (0 errors)

- [ ] **Step 7: Commit**

```bash
git add src/index.css \
        src/components/layout/AppLayout.tsx \
        src/components/ui/BulkActionBar.tsx
git commit -m "style: elevate dark mode surfaces, soften text-primary, upgrade bento to rounded-3xl"
```

---

## Task 2: Border Radius — DetailPanel (Core Elements)

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`

This file has 10 bare `rounded` (4px) instances on inputs and action buttons that should be `rounded-md` (6px) per the Core-level rule.

- [ ] **Step 1: Color name edit input (around line 331)**

```tsx
/* Before */
className="w-full bg-surface-overlay border border-accent rounded px-2 py-1 text-base font-medium text-text-primary focus:outline-none"

/* After */
className="w-full bg-surface-overlay border border-accent rounded-md px-2 py-1 text-base font-medium text-text-primary focus:outline-none"
```

- [ ] **Step 2: HEX edit input (around line 482)**

```tsx
/* Before */
'flex-1 bg-surface-overlay border rounded px-2 py-1 text-sm font-mono text-text-primary focus:outline-none transition-colors',

/* After */
'flex-1 bg-surface-overlay border rounded-md px-2 py-1 text-sm font-mono text-text-primary focus:outline-none transition-colors',
```

- [ ] **Step 3: HEX Save button (around line 490)**

```tsx
/* Before */
className="text-xs px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded transition-colors"

/* After */
className="text-xs px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-md transition-colors"
```

- [ ] **Step 4: HEX Cancel button (around line 496)**

```tsx
/* Before */
className="text-xs px-2 py-1 bg-surface-raised hover:bg-surface-overlay text-text-secondary rounded transition-colors"

/* After */
className="text-xs px-2 py-1 bg-surface-raised hover:bg-surface-overlay text-text-secondary rounded-md transition-colors"
```

- [ ] **Step 5: CMYK input fields (around line 567)**

```tsx
/* Before */
className="w-full text-center text-xs font-mono bg-surface-overlay border border-border/20 rounded px-1 py-1 text-text-primary focus:outline-none focus:border-accent"

/* After */
className="w-full text-center text-xs font-mono bg-surface-overlay border border-border/20 rounded-md px-1 py-1 text-text-primary focus:outline-none focus:border-accent"
```

- [ ] **Step 6: TAC preview / saved rows — 2 occurrences (around lines 573 and 620)**

Both lines share the identical string. Use `replace_all: true`:

```tsx
/* Before (both occurrences) */
'flex items-center justify-between px-2 py-1 rounded text-xs',

/* After */
'flex items-center justify-between px-2 py-1 rounded-md text-xs',
```

Verify: exactly 2 occurrences exist in the file.

- [ ] **Step 7: CMYK Save button (around line 584)**

```tsx
/* Before */
className="flex-1 py-1 bg-accent hover:bg-accent-hover text-white text-xs rounded transition-colors"

/* After */
className="flex-1 py-1 bg-accent hover:bg-accent-hover text-white text-xs rounded-md transition-colors"
```

- [ ] **Step 8: CMYK Cancel button (around line 591)**

```tsx
/* Before */
className="flex-1 py-1 bg-surface-raised hover:bg-surface-overlay text-text-secondary text-xs rounded transition-colors"

/* After */
className="flex-1 py-1 bg-surface-raised hover:bg-surface-overlay text-text-secondary text-xs rounded-md transition-colors"
```

- [ ] **Step 9: CMYK Edit / input button (around line 632)**

```tsx
/* Before */
className="w-full py-1 text-xs text-text-muted hover:text-text-primary bg-surface-raised hover:bg-surface-overlay rounded transition-colors"

/* After */
className="w-full py-1 text-xs text-text-muted hover:text-text-primary bg-surface-raised hover:bg-surface-overlay rounded-md transition-colors"
```

- [ ] **Step 10: TypeScript check**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit
```

Expected: No output (0 errors)

- [ ] **Step 11: Commit**

```bash
git add src/components/detail/DetailPanel.tsx
git commit -m "style: upgrade DetailPanel core elements to rounded-md"
```

---

## Task 3: Border Radius — Sidebar, FilterBar, Generator, Trash, ColorPreviewCard

**Files:**
- Modify: `src/components/sidebar/Sidebar.tsx`
- Modify: `src/components/views/FilterBar.tsx`
- Modify: `src/components/generator/GeneratorView.tsx`
- Modify: `src/components/trash/TrashView.tsx`
- Modify: `src/components/detail/ColorPreviewCard.tsx`

- [ ] **Step 1: Fix `Sidebar.tsx` — icon wrapper + tag chips (3 occurrences)**

**Change 1 — icon wrapper (around line 98):**
```tsx
/* Before */
'w-5 h-5 rounded flex items-center justify-center transition-opacity mr-0.5',

/* After */
'w-5 h-5 rounded-md flex items-center justify-center transition-opacity mr-0.5',
```

**Change 2 — tag filter chips (lines ~122 and ~135, identical string, use replace_all):**
```tsx
/* Before (2 occurrences) */
'px-1.5 py-0.5 rounded text-[10px] transition-colors leading-none',

/* After */
'px-1.5 py-0.5 rounded-md text-[10px] transition-colors leading-none',
```

Verify: exactly 2 occurrences of that string exist in the file.

- [ ] **Step 2: Fix `FilterBar.tsx` — tone chips + sort/archive buttons**

**Change 1 — tone filter chips (lines ~91 and ~107, identical string, use replace_all):**
```tsx
/* Before (2 occurrences) */
'px-1.5 py-0.5 rounded text-[10px] transition-colors flex-shrink-0 leading-none tactile',

/* After */
'px-1.5 py-0.5 rounded-md text-[10px] transition-colors flex-shrink-0 leading-none tactile',
```

**Change 2 — archive + sort buttons (lines ~125 and ~144, identical string, use replace_all):**
```tsx
/* Before (2 occurrences) */
'flex items-center justify-center w-7 h-7 rounded transition-colors tactile',

/* After */
'flex items-center justify-center w-7 h-7 rounded-md transition-colors tactile',
```

**Change 3 — sort direction button (around line 159):**
```tsx
/* Before */
className="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors tactile"

/* After */
className="flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors tactile"
```

- [ ] **Step 3: Fix `GeneratorView.tsx` — inputs + buttons (7 changes)**

**Change 1 — primary hex input (around line 218):**
```tsx
/* Before */
'flex-1 bg-surface-overlay border rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none transition-colors',

/* After */
'flex-1 bg-surface-overlay border rounded-md px-3 py-2 text-sm font-mono text-text-primary focus:outline-none transition-colors',
```

**Change 2 — Base/Sub buttons (lines ~327 and ~339, identical string, use replace_all):**
```tsx
/* Before (2 occurrences) */
'px-2 py-0.5 text-xs rounded border transition-colors',

/* After */
'px-2 py-0.5 text-xs rounded-md border transition-colors',
```

**Change 3 — multi-color hex input (around line 389):**
```tsx
/* Before */
'flex-1 bg-surface-overlay border rounded px-2.5 py-1.5 text-xs font-mono text-text-primary focus:outline-none transition-colors',

/* After */
'flex-1 bg-surface-overlay border rounded-md px-2.5 py-1.5 text-xs font-mono text-text-primary focus:outline-none transition-colors',
```

**Change 4 — delete (✕) button (around line 398):**
```tsx
/* Before */
className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors flex-shrink-0 text-sm"

/* After */
className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors flex-shrink-0 text-sm"
```

**Change 5 — result labels (ベース/サブ, 4 identical lines ~511–520, use replace_all):**
```tsx
/* Before (4 occurrences) */
className="text-xs text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded"

/* After */
className="text-xs text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded-md"
```

Verify: exactly 4 occurrences.

**Change 6 — save one button (around line 538):**
```tsx
/* Before */
className="text-xs text-text-muted hover:text-text-primary disabled:opacity-50 px-2 py-1 hover:bg-surface-overlay rounded transition-colors flex-shrink-0"

/* After */
className="text-xs text-text-muted hover:text-text-primary disabled:opacity-50 px-2 py-1 hover:bg-surface-overlay rounded-md transition-colors flex-shrink-0"
```

- [ ] **Step 4: Fix `TrashView.tsx` — restore + delete buttons**

```tsx
/* Before (around line 77) */
className="px-2 py-1 text-xs text-text-muted hover:text-text-primary bg-surface-overlay hover:bg-surface-raised rounded transition-colors"

/* After */
className="px-2 py-1 text-xs text-text-muted hover:text-text-primary bg-surface-overlay hover:bg-surface-raised rounded-md transition-colors"
```

```tsx
/* Before (around line 84) */
className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-surface-overlay hover:bg-surface-raised rounded transition-colors"

/* After */
className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-surface-overlay hover:bg-surface-raised rounded-md transition-colors"
```

- [ ] **Step 5: Fix `ColorPreviewCard.tsx` — badge span (around line 77)**

```tsx
/* Before */
className="text-xs px-2 py-0.5 rounded"

/* After */
className="text-xs px-2 py-0.5 rounded-md"
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx tsc --noEmit
```

Expected: No output (0 errors)

- [ ] **Step 7: Vite build check**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker && npx vite build 2>&1 | grep -E "built|error"
```

Expected: `✓ built in X.XXs` — no errors

- [ ] **Step 8: Commit**

```bash
git add src/components/sidebar/Sidebar.tsx \
        src/components/views/FilterBar.tsx \
        src/components/generator/GeneratorView.tsx \
        src/components/trash/TrashView.tsx \
        src/components/detail/ColorPreviewCard.tsx
git commit -m "style: unify core elements to rounded-md across sidebar, filterbar, generator, trash"
```

---

## Visual Verification Checklist (after all tasks)

Run `npm run dev:vite` and verify in **dark mode** (light mode protected — no bg/text changes there):

| Area | Expected (dark) | Expected (light) |
|------|----------------|-----------------|
| Bento panel corners | Noticeably rounder (24px) | Same |
| List item hover bg | Clearer lighter blue on hover | Unchanged |
| List item active bg | Clearly elevated blue layer | Unchanged |
| Color code card area | Visibly brighter than container bg | Unchanged |
| Input fields (CMYK, HEX) | Visibly elevated surface | Unchanged |
| Primary text | Soft off-white, less harsh | Unchanged |
| Input / button radius | Smooth 6px rounding (not sharp, not pill) | Same |
| Filter chips, sort buttons | Consistent 6px rounding | Same |
| CMYK Save/Cancel buttons | 6px rounding | Same |
| Generator pattern labels | 6px rounding | Same |
| Trash restore/delete | 6px rounding | Same |
| BulkActionBar background | Matches elevated surface tone | Unchanged |

**Constraint checklist:**
- [ ] No layout shifts (padding/margin unchanged)
- [ ] Phase 6.1 borders (border-border/N) untouched
- [ ] Light mode colors unchanged (`[data-theme="light"]` block not edited)
- [ ] Accent borders (focus:border-accent) unaffected
- [ ] Error borders (border-red-500) unaffected
- [ ] `rounded-full` color swatches / avatars unchanged
- [ ] `rounded-xl` / `rounded-lg` inner panels unchanged (only bare `rounded` was upgraded)
