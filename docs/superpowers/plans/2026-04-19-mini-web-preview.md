# Mini Web Preview (ColorPreviewCard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deprecated UITestView with a scoped `ColorPreviewCard` that renders a dummy web UI using selected palette colors — accessible via the same sidebar icon, rendered inside each list item's expandable area (matching the ContrastChecker pattern).

**Architecture:** Add `'preview'` to `ActiveMode` in `uiStore`. Create `previewStore` to manage 4 color slots (BG auto-fills from selected color; Text/Button auto-compute WCAG contrast; Accent starts unassigned). `ContextualPanel` gains an `isPreview` branch that renders `ColorPreviewCard`. `ListView` intercepts color clicks when a slot is waiting for assignment. Old `UITestView` + `uiTestStore` are fully deleted.

**Tech Stack:** React, Zustand, `@phosphor-icons/react`, `framer-motion`, Tailwind CSS, TypeScript strict mode

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| **Create** | `src/store/previewStore.ts` | 4-slot state, WCAG auto-calc, slot assignment |
| **Create** | `src/components/detail/ColorPreviewCard.tsx` | Dummy web card UI + slot badges + contrast warnings |
| **Modify** | `src/store/uiStore.ts` | Add `'preview'` to `ActiveMode`; remove `'ui-test'` from `NavSection` |
| **Modify** | `src/components/color/ContextualPanel.tsx` | Add `isPreview` branch + `syncBgFromSelected` effect |
| **Modify** | `src/components/views/ListView.tsx` | Intercept click when `activeSlot !== null` |
| **Modify** | `src/components/sidebar/Sidebar.tsx` | Change UITest nav→action; toggle `activeMode = 'preview'` |
| **Modify** | `src/components/layout/AppLayout.tsx` | Remove `UITestView` import + `isUITest` checks |
| **Modify** | `src/components/ui/Icons.tsx` | Add `IconWarningCircle` |
| **Delete** | `src/components/uitest/UITestView.tsx` | (deprecated) |
| **Delete** | `src/store/uiTestStore.ts` | (deprecated) |

---

## Task 1: Add `'preview'` to `ActiveMode` in `uiStore.ts`

**Files:**
- Modify: `src/store/uiStore.ts`

- [ ] **Step 1: Edit the type**

In `src/store/uiStore.ts`, change line 6:

```typescript
// Before
export type ActiveMode = 'normal' | 'contrast'

// After
export type ActiveMode = 'normal' | 'contrast' | 'preview'
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors (adding a union member is non-breaking).

- [ ] **Step 3: Commit**

```bash
git add src/store/uiStore.ts
git commit -m "feat: add 'preview' to ActiveMode type"
```

---

## Task 2: Add `IconWarningCircle` to `Icons.tsx`

**Files:**
- Modify: `src/components/ui/Icons.tsx`

- [ ] **Step 1: Add the export**

Append to the existing export block in `src/components/ui/Icons.tsx`, after `ArrowDown as IconSortDesc`:

```typescript
  // ── 警告アイコン ─────────────────────────────────────────
  WarningCircle  as IconWarningCircle,   // コントラスト警告
```

The full file after change:

```typescript
export {
  // ── 3×3 グリッド ──────────────────────────────────────────
  SquaresFour    as IconSquaresFour,
  Star           as IconStar,
  MagicWand      as IconMagicWand,
  ImageSquare    as IconImageSquare,
  Eyedropper     as IconEyedropper,
  PlusCircle     as IconPlusCircle,
  Layout         as IconLayout,
  CircleHalf     as IconCircleHalf,
  Swatches       as IconSwatches,

  // ── ボトムドック ──────────────────────────────────────────
  Trash          as IconTrash,
  DownloadSimple as IconDownloadSimple,
  Sun            as IconSun,
  Moon           as IconMoon,

  // ── サイドバー Chrome ─────────────────────────────────────
  SidebarSimple    as IconSidebarSimple,
  MagnifyingGlass  as IconMagnifyingGlass,
  CaretRight       as IconCaretRight,
  FolderSimple     as IconFolder,
  Tag              as IconTag,
  Clock            as IconClock,
  Palette          as IconPalette,
  TrendUp          as IconTrendUp,
  Archive          as IconArchive,

  // ── アクション ───────────────────────────────────────────
  Plus                as IconPlus,
  X                   as IconX,
  Copy                as IconCopy,
  Check               as IconCheck,
  Pencil              as IconPencil,
  Lock                as IconLock,
  LockOpen            as IconLockOpen,
  ArrowUUpLeft        as IconArrowUUpLeft,
  ArrowBendDownRight  as IconArrowBendDownRight,
  FloppyDisk          as IconFloppyDisk,

  // ── FAB / BulkActionBar ──────────────────────────────────
  Sparkle          as IconSparkle,
  Monitor          as IconMonitor,
  FolderSimplePlus as IconFolderSimplePlus,

  // ── ソート ───────────────────────────────────────────────
  ArrowUp   as IconSortAsc,
  ArrowDown as IconSortDesc,

  // ── 警告 ─────────────────────────────────────────────────
  WarningCircle  as IconWarningCircle,
} from '@phosphor-icons/react'

export type { Icon as PhosphorIcon } from '@phosphor-icons/react'
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Icons.tsx
git commit -m "feat: add IconWarningCircle to Icons"
```

---

## Task 3: Create `previewStore.ts`

**Files:**
- Create: `src/store/previewStore.ts`

- [ ] **Step 1: Create the file**

```typescript
import { create } from 'zustand'
import { getSuggestedTextColor } from '@/lib/contrastUtils'

export type SlotKey = 'bg' | 'text' | 'button' | 'accent'

export interface PreviewSlot {
  hex: string | null
  isAuto: boolean
}

interface PreviewStore {
  slots: Record<SlotKey, PreviewSlot>
  activeSlot: SlotKey | null
  syncBgFromSelected: (hex: string) => void
  setSlot: (key: SlotKey, hex: string) => void
  clearSlot: (key: SlotKey) => void
  setActiveSlot: (key: SlotKey | null) => void
  reset: () => void
}

const EMPTY_SLOTS: Record<SlotKey, PreviewSlot> = {
  bg:     { hex: null, isAuto: false },
  text:   { hex: null, isAuto: true },
  button: { hex: null, isAuto: true },
  accent: { hex: null, isAuto: true },
}

export const usePreviewStore = create<PreviewStore>((set) => ({
  slots: { ...EMPTY_SLOTS },
  activeSlot: null,

  syncBgFromSelected: (hex) => {
    set((state) => {
      const autoColor = getSuggestedTextColor(hex)
      return {
        slots: {
          bg:     { hex, isAuto: false },
          text:   state.slots.text.isAuto   ? { hex: autoColor, isAuto: true } : state.slots.text,
          button: state.slots.button.isAuto ? { hex: autoColor, isAuto: true } : state.slots.button,
          accent: state.slots.accent,
        },
      }
    })
  },

  setSlot: (key, hex) => {
    set((state) => ({
      slots: { ...state.slots, [key]: { hex, isAuto: false } },
      activeSlot: null,
    }))
  },

  clearSlot: (key) => {
    set((state) => {
      const bgHex = state.slots.bg.hex ?? '#000000'
      const autoColor = getSuggestedTextColor(bgHex)
      const restored: PreviewSlot =
        key === 'accent'
          ? { hex: null, isAuto: true }
          : { hex: autoColor, isAuto: true }
      return { slots: { ...state.slots, [key]: restored } }
    })
  },

  setActiveSlot: (key) => set({ activeSlot: key }),

  reset: () => {
    set((state) => {
      const bgHex = state.slots.bg.hex ?? '#000000'
      const autoColor = getSuggestedTextColor(bgHex)
      return {
        slots: {
          bg:     { hex: bgHex, isAuto: false },
          text:   { hex: autoColor, isAuto: true },
          button: { hex: autoColor, isAuto: true },
          accent: { hex: null, isAuto: true },
        },
        activeSlot: null,
      }
    })
  },
}))
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/previewStore.ts
git commit -m "feat: add previewStore with 4-slot WCAG auto-calc"
```

---

## Task 4: Create `ColorPreviewCard.tsx`

**Files:**
- Create: `src/components/detail/ColorPreviewCard.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { usePreviewStore, type SlotKey } from '@/store/previewStore'
import { getContrastRatio, getSuggestedTextColor } from '@/lib/contrastUtils'
import { IconWarningCircle } from '@/components/ui/Icons'

const SLOT_LABELS: Record<SlotKey, string> = {
  bg:     'BG',
  text:   'Text',
  button: 'Btn',
  accent: 'Accent',
}

export function ColorPreviewCard() {
  const { slots, activeSlot, setActiveSlot, clearSlot } = usePreviewStore()

  const bgHex     = slots.bg.hex     ?? '#1a1a2e'
  const textHex   = slots.text.hex   ?? '#ffffff'
  const buttonHex = slots.button.hex ?? '#000000'
  const accentHex = slots.accent.hex

  const buttonTextColor = getSuggestedTextColor(buttonHex)
  const textContrast    = getContrastRatio(bgHex, textHex)
  const buttonContrast  = getContrastRatio(bgHex, buttonHex)

  const textWarning   = slots.text.hex   !== null && textContrast   < 4.5
  const buttonWarning = slots.button.hex !== null && buttonContrast < 1.5

  const handleBadgeClick = (key: SlotKey) => {
    if (activeSlot === key) {
      if (key !== 'bg') clearSlot(key)
      setActiveSlot(null)
    } else {
      setActiveSlot(key)
    }
  }

  return (
    <div className="space-y-3">
      {/* ── Dummy Web Card ── */}
      <div
        className="rounded-xl p-4 w-full"
        style={{ backgroundColor: bgHex, minHeight: 160 }}
      >
        <h3
          className="text-sm font-semibold mb-1"
          style={{ color: textHex }}
        >
          Sample Heading
        </h3>
        <p
          className="text-xs mb-3"
          style={{ color: textHex, opacity: 0.65 }}
        >
          Body copy. Lorem ipsum dolor sit amet.
        </p>

        {/* Divider (accent or dashed fallback) */}
        <div
          className="mb-3"
          style={
            accentHex
              ? { borderTop: `1px solid ${accentHex}` }
              : { borderTop: '1px dashed rgba(128,128,128,0.35)' }
          }
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs px-2.5 py-1 rounded-md"
            style={{ backgroundColor: buttonHex, color: buttonTextColor }}
          >
            Primary Btn
          </button>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              border: `1px solid ${accentHex ?? 'rgba(128,128,128,0.35)'}`,
              color: textHex,
              opacity: accentHex ? 1 : 0.45,
            }}
          >
            {accentHex ? 'Badge' : '?'}
          </span>
        </div>
      </div>

      {/* ── Slot Badges ── */}
      <div className="flex gap-1.5 flex-wrap">
        {(Object.keys(SLOT_LABELS) as SlotKey[]).map((key) => {
          const slot        = slots[key]
          const isActive    = activeSlot === key
          const hasWarning  =
            (key === 'text'   && textWarning) ||
            (key === 'button' && buttonWarning)
          const warningTip  =
            key === 'text'
              ? `コントラスト比 ${textContrast.toFixed(1)} — WCAG AA 基準（4.5）を下回っています`
              : `コントラスト比 ${buttonContrast.toFixed(1)} — ボタンが背景に溶けています`

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleBadgeClick(key)}
              title={isActive ? 'リストから色を選んでください' : `${SLOT_LABELS[key]} スロット`}
              className={[
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all',
                isActive
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-border text-text-secondary hover:border-text-muted',
              ].join(' ')}
            >
              {slot.hex ? (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: slot.hex }}
                />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-white/30 flex-shrink-0" />
              )}

              <span>{SLOT_LABELS[key]}</span>

              {slot.hex ? (
                <span className="font-mono text-[9px] text-text-muted">
                  {slot.hex.toUpperCase()}
                </span>
              ) : (
                <span className="text-text-muted text-[9px]">未割り当て</span>
              )}

              {slot.isAuto && slot.hex && (
                <span className="text-[8px] text-text-muted opacity-50">auto</span>
              )}

              {hasWarning && (
                <span title={warningTip}>
                  <IconWarningCircle size={10} weight="fill" className="text-yellow-400" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Assignment hint ── */}
      {activeSlot && (
        <p className="text-[11px] text-text-muted">
          リストから色を選んで{' '}
          <span className="text-text-secondary font-medium">{SLOT_LABELS[activeSlot]}</span>
          {' '}に割り当て
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/detail/ColorPreviewCard.tsx
git commit -m "feat: add ColorPreviewCard with slot badges and contrast warnings"
```

---

## Task 5: Update `ContextualPanel.tsx`

**Files:**
- Modify: `src/components/color/ContextualPanel.tsx`

- [ ] **Step 1: Rewrite the file**

Replace the entire file content with:

```typescript
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TagInput } from '@/components/color/TagInput'
import { MoodImageSlots } from '@/components/color/MoodImageSlots'
import { ContrastChecker } from '@/components/detail/ContrastChecker'
import { ColorPreviewCard } from '@/components/detail/ColorPreviewCard'
import { useColorStore } from '@/store/colorStore'
import { useUIStore } from '@/store/uiStore'
import { usePreviewStore } from '@/store/previewStore'
import type { Color } from '@/types/database'

interface ContextualPanelProps {
  color: Color
}

function MemoArea({ color }: { color: Color }) {
  const { updateColor } = useColorStore()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState('')

  const handleEdit = () => {
    if (color.is_locked) return
    setValue(color.memo ?? '')
    setIsEditing(true)
  }

  const handleSubmit = () => {
    updateColor(color.id, { memo: value.trim() || null })
    setIsEditing(false)
  }

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs text-text-muted mb-1">メモ</p>
      {isEditing ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Escape') setIsEditing(false)
          }}
          autoFocus
          rows={3}
          className="w-full bg-transparent border-0 text-xs text-text-primary focus:outline-none resize-none placeholder:text-text-muted leading-relaxed"
        />
      ) : (
        <button
          onClick={handleEdit}
          type="button"
          className="w-full text-left text-xs text-text-secondary hover:text-text-primary transition-colors leading-relaxed"
        >
          {color.memo || <span className="text-text-muted">クリックしてメモを追加...</span>}
        </button>
      )}
    </div>
  )
}

export function ContextualPanel({ color }: ContextualPanelProps) {
  const { activeMode } = useUIStore()
  const { syncBgFromSelected } = usePreviewStore()

  const isContrast = activeMode === 'contrast'
  const isPreview  = activeMode === 'preview'

  // Sync BG slot whenever this color changes while in preview mode
  useEffect(() => {
    if (isPreview) {
      syncBgFromSelected(color.hex)
    }
  }, [color.hex, isPreview, syncBgFromSelected])

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.5 }}
      className="overflow-hidden"
    >
      <div className="mx-3 border-t border-border/30" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.04 }}
      >
        {isContrast ? (
          /* ── コントラストモード ── */
          <div className="px-3 py-3">
            <ContrastChecker color={color} />
          </div>
        ) : isPreview ? (
          /* ── Web プレビューモード ── */
          <div className="px-3 py-3">
            <ColorPreviewCard />
          </div>
        ) : (
          /* ── 通常モード：画像 + メモ + タグ ── */
          <div className="flex gap-0 min-h-[88px]">
            <div className="flex-shrink-0 px-3 py-3 flex items-center">
              <MoodImageSlots colorId={color.id} />
            </div>
            <div className="w-px bg-border/30 flex-shrink-0 my-3" />
            <div className="flex-1 min-w-0 px-3 py-3 space-y-3">
              <MemoArea color={color} />
              <div>
                <p className="text-xs text-text-muted mb-1">タグ</p>
                <TagInput colorId={color.id} isLocked={color.is_locked} />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/color/ContextualPanel.tsx
git commit -m "feat: add preview mode branch to ContextualPanel"
```

---

## Task 6: Update `ListView.tsx` — intercept slot assignment clicks

**Files:**
- Modify: `src/components/views/ListView.tsx`

- [ ] **Step 1: Add previewStore import**

Add the following import after the existing imports in `src/components/views/ListView.tsx`:

```typescript
import { usePreviewStore } from '@/store/previewStore'
```

- [ ] **Step 2: Add slot assignment in `handleSelect`**

In the `ListView` function body, add the store call right after `useUIStore()` destructuring and before `handleSelect` is defined:

```typescript
const { activeSlot, setSlot } = usePreviewStore()
```

Then modify `handleSelect` so that the first thing it does is check for an active slot:

```typescript
const handleSelect = (color: Color, index: number, e: React.MouseEvent) => {
  // When a preview slot is waiting for assignment, assign and stop
  if (activeSlot !== null) {
    setSlot(activeSlot, color.hex)
    return
  }

  if (e.shiftKey && lastSelectedIndexRef.current >= 0) {
    // 範囲選択
    const from = Math.min(lastSelectedIndexRef.current, index)
    const to = Math.max(lastSelectedIndexRef.current, index)
    const rangeIds = visibleColors.slice(from, to + 1).map((c) => c.id)
    const merged = Array.from(new Set([...bulkSelectedIds, ...rangeIds]))
    setBulkSelectedIds(merged)
  } else if (e.metaKey || e.ctrlKey) {
    lastSelectedIndexRef.current = index
    toggleBulkSelect(color.id)
    setSelectedColorId(null)
  } else {
    lastSelectedIndexRef.current = index
    setSelectedColorId(selectedColorId === color.id ? null : color.id)
  }
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/views/ListView.tsx
git commit -m "feat: intercept list click for preview slot assignment"
```

---

## Task 7: Update `Sidebar.tsx` — UITest → Preview action

**Files:**
- Modify: `src/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Change the UITest grid cell from `nav` to `action`**

Find the line:
```typescript
{ kind: 'nav',    Icon: IconLayout,      label: 'UIテスト',                   section: 'ui-test' },
```

Replace with:
```typescript
{
  kind: 'action',
  Icon: IconLayout,
  label: 'Web プレビュー',
  isActive: activeMode === 'preview',
  onClick: () => setActiveMode((activeMode === 'preview' ? 'normal' : 'preview') as ActiveMode),
},
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. (`'preview'` is now a valid `ActiveMode`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar/Sidebar.tsx
git commit -m "feat: replace UITest nav with Web Preview action in sidebar grid"
```

---

## Task 8: Clean up — delete old files, fix AppLayout, uiStore, GeneratorView, index.css

**Files:**
- Delete: `src/components/uitest/UITestView.tsx`
- Delete: `src/store/uiTestStore.ts`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/store/uiStore.ts`
- Modify: `src/components/generator/GeneratorView.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Delete the deprecated files**

```bash
rm src/components/uitest/UITestView.tsx
rm src/store/uiTestStore.ts
```

- [ ] **Step 2: Remove `'ui-test'` from `NavSection` in `uiStore.ts`**

Change line 4 in `src/store/uiStore.ts`:

```typescript
// Before
export type NavSection = 'all' | 'favorites' | 'history' | 'generator' | 'ui-test' | 'trash'

// After
export type NavSection = 'all' | 'favorites' | 'history' | 'generator' | 'trash'
```

- [ ] **Step 3: Clean `AppLayout.tsx`**

Make the following changes to `src/components/layout/AppLayout.tsx`:

**3a. Remove the UITestView import (line 7):**
```typescript
// Remove this line entirely:
import { UITestView } from '@/components/uitest/UITestView'
```

**3b. Update `sectionTitle` (around line 336):**
```typescript
// Before
const sectionTitle =
  activeSection === 'favorites' ? 'お気に入り' :
  activeSection === 'history' ? '最近使った色' :
  activeSection === 'generator' ? 'カラージェネレーター' :
  activeSection === 'ui-test' ? 'UIテスト' :
  activeSection === 'trash' ? 'ゴミ箱' :
  'すべての色'

// After
const sectionTitle =
  activeSection === 'favorites' ? 'お気に入り' :
  activeSection === 'history' ? '最近使った色' :
  activeSection === 'generator' ? 'カラージェネレーター' :
  activeSection === 'trash' ? 'ゴミ箱' :
  'すべての色'
```

**3c. Remove the `isUITest` boolean (around line 344):**
```typescript
// Before
const isGenerator = activeSection === 'generator'
const isUITest = activeSection === 'ui-test'
const isTrash = activeSection === 'trash'

// After
const isGenerator = activeSection === 'generator'
const isTrash = activeSection === 'trash'
```

**3d. Update the ViewToggle condition (around line 444):**
```typescript
// Before
{!isGenerator && !isUITest && !isTrash && (
  <ViewToggle mode={viewMode} onChange={setViewMode} />
)}

// After
{!isGenerator && !isTrash && (
  <ViewToggle mode={viewMode} onChange={setViewMode} />
)}
```

**3e. Remove the `isUITest` branch from the content area (around line 466):**
```typescript
// Before
{isGenerator ? (
  <GeneratorView />
) : isUITest ? (
  <UITestView />
) : isTrash ? (

// After
{isGenerator ? (
  <GeneratorView />
) : isTrash ? (
```

- [ ] **Step 4: Update `GeneratorView.tsx` — replace "UIテスト" button with "Web プレビュー"**

In `src/components/generator/GeneratorView.tsx`:

Remove the `useUITestStore` import (line 6) and the `setSlotHex, applyToUI` destructuring (line 26).

Add the following import instead:
```typescript
import { usePreviewStore } from '@/store/previewStore'
```

Add the following destructuring in the `GeneratorView` function body:
```typescript
const { setSlot } = usePreviewStore()
const { setActiveMode, setActiveSection } = useUIStore()
```

Replace `handleSendToUITest` with:
```typescript
const handleSendToPreview = () => {
  const slots: Array<'bg' | 'text' | 'button' | 'accent'> = ['bg', 'text', 'button', 'accent']
  generatedColors.slice(0, 4).forEach((hex, i) => {
    setSlot(slots[i], hex)
  })
  setActiveMode('preview')
  setActiveSection('all')
}
```

Replace the button JSX:
```tsx
// Before
<button
  type="button"
  onClick={handleSendToUITest}
  className="px-3 py-1 text-xs border border-border text-text-muted hover:text-text-primary hover:border-accent/50 rounded-lg transition-colors"
  title="生成した色をUIテストモードに送って確認"
>
  UIテスト ↗
</button>

// After
<button
  type="button"
  onClick={handleSendToPreview}
  className="px-3 py-1 text-xs border border-border text-text-muted hover:text-text-primary hover:border-accent/50 rounded-lg transition-colors"
  title="生成した色をWebプレビューに送って確認"
>
  Web プレビュー ↗
</button>
```

- [ ] **Step 5: Remove `[data-ui-test-active]` CSS block from `index.css`**

In `src/index.css`, find and delete the entire block from the comment to the last closing brace (approximately lines 358–405):

```css
/* ═══════════════════════════════════════════════════════════════════════════
   UIテストモード — html[data-ui-test-active] で標準テーマを一時的に上書き
   JS 側で html 属性と inline CSS 変数を削除するだけで :root 定義値に完全復元。
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── メイン: 最背面に薄いカラーオーバーレイ（Vibrancy 透け感は維持） ── */
html[data-ui-test-active],
html[data-ui-test-active] body {
  background: rgb(var(--uitest-main-rgb) / 0.22);
}

/* ── サポート: Bento コンテナ背景色（backdrop-filter は絶対に維持） ── */
html[data-ui-test-active] .bento-pane {
  background: rgb(var(--uitest-support-rgb) / 0.85);
}
html[data-ui-test-active] .bento-pane-neutral {
  background: rgb(var(--uitest-support-rgb) / 0.90);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
}
html[data-ui-test-active] .glass-popup {
  background: rgb(var(--uitest-support-rgb) / 0.88);
}

/* ── アクセント: グロー系エフェクトをアクセントカラーに連動 ── */
html[data-ui-test-active] .sig-glow-active {
  filter: drop-shadow(0 0 6px rgb(var(--uitest-accent-rgb) / 0.60));
}
html[data-ui-test-active] .glow-accent {
  box-shadow:
    0 0 12px rgb(var(--uitest-accent-rgb) / 0.36),
    0 2px 6px  rgb(var(--uitest-accent-rgb) / 0.18);
}
html[data-ui-test-active] .glow-accent-sm {
  box-shadow: 0 0 8px rgb(var(--uitest-accent-rgb) / 0.16);
}
html[data-ui-test-active] .glow-accent-btn {
  box-shadow:
    0 0 12px rgb(var(--uitest-accent-rgb) / 0.32),
    0 2px 6px  rgb(var(--uitest-accent-rgb) / 0.16);
}
html[data-ui-test-active] .ring-selection {
  box-shadow:
    0 0 0 2px   rgb(var(--color-surface)),
    0 0 0 3.5px rgb(var(--uitest-accent-rgb)),
    0 0 6px     rgb(var(--uitest-accent-rgb) / 0.35);
}
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. All references to `'ui-test'`, `UITestView`, and `uiTestStore` are gone.

- [ ] **Step 7: Commit**

```bash
git add src/store/uiStore.ts src/components/layout/AppLayout.tsx \
        src/components/generator/GeneratorView.tsx src/index.css
git commit -m "chore: remove UITestView/uiTestStore, wire generator to previewStore"
```

---

## Task 9: Manual Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify UITestView is gone**

Open the app. The sidebar Layout icon should toggle (not navigate to a separate view). No "UIテスト" full-screen page should exist.

- [ ] **Step 3: Verify Preview mode activates**

1. Click a color to select it (expand ContextualPanel)
2. Click the `Layout` icon (グリッド3段目左) in the sidebar
3. The ContextualPanel area should switch from メモ/タグ to the `ColorPreviewCard`
4. The dummy web card should show with the selected color as background
5. Text and Button badges should show "#FFFFFF" or "#000000" with "auto" label
6. Accent badge should show "未割り当て" with dashed circle

- [ ] **Step 4: Verify slot assignment**

1. With Preview mode active and a color selected (ContextualPanel open)
2. Click the "Btn" badge → it highlights with accent ring
3. Click a different color in the list → the button slot updates to that color, no navigation
4. The ContextualPanel stays open on the original color

- [ ] **Step 5: Verify contrast warnings**

1. Select a mid-gray color (e.g. `#888888`)
2. Enter preview mode → Text badge shows `#000000 auto`
3. Manually assign a color with poor contrast (e.g. `#777777` to Text slot)
4. `WarningCircle` should appear next to the Text badge
5. Hover the warning icon → tooltip shows contrast ratio and WCAG AA message

- [ ] **Step 6: Verify mode persistence**

1. Enter Preview mode, assign a custom color to a slot
2. Click the ContrastChecker icon → mode switches to contrast, DetailPanel stays
3. Click ContrastChecker again → back to normal mode (not preview)
4. Click Layout icon again → preview mode resumes with the previously assigned slot still present

- [ ] **Step 7: Verify Bentoグラス/Glow styles are untouched**

Confirm that the existing Bento Glass backdrop-blur, signature blue glow on nav icons, and fluid animations are unchanged.

- [ ] **Step 8: Final commit tag**

```bash
git add -A
git commit -m "feat: Phase 6 Mini Web Preview (ColorPreviewCard) complete"
```
