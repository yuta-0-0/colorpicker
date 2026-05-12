# macOS Bento Glass Edition — Design Spec

**Date:** 2026-04-16  
**Project:** カラーピッカー (colorpicker)  
**Status:** Approved by user

---

## Overview

Liquid Glass Edition の延長として、macOS Native のガラス質感と Bento Grid 構造を組み合わせた最終デザインへ移行する。各パネルを独立した `rounded-2xl` コンテナとして配置し、区切り線を廃止。リストアイテムはアクティブ状態に「枠線 + 影のみ」で表現し、塗りを一切行わない。

---

## 1. Color & Background

### CSS Variables (src/index.css)

**Light mode:**
- Base: `#FDFDFD` → `--color-bg: 253 253 253`
- Container (Bento Pane): `#ECEFFA` → `--color-surface: 236 239 250`
- Surface raised: slightly lighter than container → `--color-surface-raised: 244 246 255`
- Surface overlay: `--color-surface-overlay: 240 243 255`

**Dark mode:**
- Base: `#0B0C12` → `--color-bg: 11 12 18`
- Container (Bento Pane): `#090C1D` → `--color-surface: 9 12 29`
- Surface raised: `--color-surface-raised: 13 17 36`
- Surface overlay: `--color-surface-overlay: 16 20 42`

### Container Glass Effect
All Bento pane containers apply:
```css
background: rgba(var(--color-surface), 0.8);
backdrop-filter: blur(24px) saturate(180%);
-webkit-backdrop-filter: blur(24px) saturate(180%);
border-radius: 1rem; /* rounded-2xl = 16px */
```

No border on containers (the color distinction and shadow separate them from the base).

---

## 2. Layout — Bento Grid

### Overall Structure
```
[App Window]
├── Header bar (80px left transparent zone + drag region)
├── Body
│   ├── Sidebar container  [rounded-2xl, gap-4]
│   └── Main area
│       ├── Toolbar container  [rounded-2xl]
│       ├── List/Gallery container  [rounded-2xl]
│       └── Detail Panel container  [rounded-2xl]
```

All containers have `gap-4` (16px) between them. No divider borders between sections.

### Header / Traffic Light Clearance
- Left 80px: transparent, no interactive elements (Electron traffic lights zone)
- The window bar uses `-webkit-app-region: drag` so users can drag the window
- Sidebar toggle icon appears at approximately x=80px (right edge of traffic light zone)
- All buttons within the header use `-webkit-app-region: no-drag`

### Sidebar Toggle Position
- Fixed at `left: 80px, top: 8px` (or equivalent within the header)
- `z-index: 50` to stay above panels
- Icon: `PanelLeftClose` / `PanelLeftOpen` (lucide-react, size=16, strokeWidth=1.5)

---

## 3. List Items

### Normal State
```css
background: transparent;
border: 1px solid rgba(0,0,0,0.05);   /* light: border-black/5 */
border: 1px solid rgba(255,255,255,0.05); /* dark: border-white/5 */
border-radius: 10px;  /* rounded-xl */
```

### Active / Selected State
No background fill. Express selection through:
```css
border: 2px solid rgb(14, 165, 233);  /* sky-500 */
box-shadow: 0 4px 16px rgba(14, 165, 233, 0.25), 0 8px 32px rgba(0,0,0,0.2);
```

The "physical lift" shadow creates depth without color filling the item.

### Hover State
```css
background: rgba(var(--color-surface-overlay), 0.5);
border: 1px solid rgba(0,0,0,0.08);  /* slightly more visible */
```

### Implementation
CSS classes in `index.css`:
- `.list-item` — base transparent style
- `.list-item-active` — sky-500 border + drop shadow
- `.list-item-hover` — subtle overlay on hover

Update `ColorListItem.tsx` to use these classes based on `isSelected` prop.

---

## 4. Search Bar

### Position
Move search bar to top of the sidebar container (currently in header area → moves to sidebar top).

### Design
```css
background: rgba(var(--color-surface-overlay), 0.6);
border: 1px solid rgba(var(--color-border), 0.3);
border-radius: 8px;  /* rounded-lg */
```

### Focus Ring
On focus, animate a 2px blue ring:
```css
outline: none;
box-shadow: 0 0 0 2px rgb(14, 165, 233);  /* ring-sky-500 */
transition: box-shadow 0.15s ease;
```

---

## 5. Interaction — Tactile Feedback

### `.tactile` CSS Class
Extend the existing `.tactile` class (or add if missing) to include `scale(0.97)` on active:

```css
.tactile {
  transition: transform 0.1s ease, opacity 0.1s ease;
}
.tactile:active {
  transform: scale(0.97);
  opacity: 0.85;
}
```

Apply `.tactile` to:
- All sidebar navigation items
- All list items (ColorListItem)
- All gallery items (ColorGalleryItem)
- All icon buttons (copy, delete, lock, favorite)
- Folder items

### Selection Modes
- Normal click: single select
- Cmd+click: toggle individual item in/out of multi-selection
- Shift+click: range select from last selected to clicked item
- `user-select: none` on all list containers

---

## 6. Folder Nesting

### Visual Indent
Nested folders (subfolders) receive a left indent to communicate hierarchy:
```css
/* depth 1 */ padding-left: 1rem;   /* 16px */
/* depth 2 */ padding-left: 2rem;   /* 32px */
```

Rendered with a thin vertical guide line:
```css
border-left: 1px solid rgba(var(--color-border), 0.3);
margin-left: 8px;
```

### Data Model
`folders` table does not currently have a `parent_id` column. Since this is a visual-only indent (not true nesting in DB), implement as a UI-layer grouping based on folder `order` and optional metadata. **If DB schema change is needed, confirm separately.**

For now: support 1 level of visual indent via a `parent_id` field in the store, without DB migration. Mark as placeholder until schema is confirmed.

---

## 7. Preserved from Liquid Glass Edition

The following remain unchanged from the previous implementation:
- IME guard in `TagInput.tsx` (`isComposing` check) ✓
- Hue sort in gallery view ✓
- LiquidDock tab mode 80×24 capsule ✓
- FolderIconPicker with 29 lucide icons ✓
- ShortcutHelpModal ✓
- UITestStore 4-slot CSS variables ✓

---

## 8. Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Update CSS variables for new colors; add `.list-item`, `.list-item-active`, `.list-item-hover`, extend `.tactile` |
| `src/components/layout/AppLayout.tsx` | Bento Grid structure, header 80px clearance, gap-4 spacing, remove divider borders |
| `src/components/sidebar/Sidebar.tsx` | Move search bar to top of sidebar container, sidebar toggle at x=80px |
| `src/components/color/ColorListItem.tsx` | Apply `.list-item` / `.list-item-active` classes, add Shift+click / Cmd+click logic |
| `src/components/color/ColorGalleryItem.tsx` | Apply `.tactile` class |
| `src/components/views/ListView.tsx` | `user-select: none`, multi-select state management |
| `src/store/uiStore.ts` | Add `selectedColorIds: Set<string>`, `lastSelectedId: string | null` for range selection |

---

## 9. Out of Scope

- DB schema change for `parent_id` on folders (separate confirmation required)
- Light mode polish beyond color variable updates
- LiquidDock redesign (completed in previous session)
- Any v2 features from the design document

---

## Approval

User provided the definitive spec on 2026-04-16 with the directive:
> "選択状態（アクティブ）: 塗りを行わず、2px の border-sky-500 と 強めのドロップシャドウ による「物理的な浮き」のみで表現せよ。"

This spec is the approved design. Proceed to implementation plan.
