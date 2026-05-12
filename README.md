# .blue

A **Judgment OS** for color memory and design cognition.

## Concept

.blue is a cognitive support system for designers, not a traditional color picker.

It stabilizes design judgment, preserves color memory, and reduces cognitive switching costs—enabling deep focus on the work itself.

## Three-Part Architecture

| State | Role | Duration |
|-------|------|----------|
| **A: Capsule** | Standby mode. Minimal footprint, always accessible. | Default |
| **B: Floating Bar** | Active working memory. Current color + swap + context. | While deciding |
| **C: Handy Dock** | Context bookmark. Quick return to critical colors. | During session |
| **Main Library** | Long-term color memory. Searchable, revisitable judgment record. | Permanent |

## Design Principle

- **Acquisition ≠ Saving** — taking a color is not yet a commitment
- **Saving ≠ Memory** — storing is not the same as understanding
- **UI ≠ Philosophy** — structure serves cognition, not the reverse

## Tech Stack

- **Tauri 2** — lightweight desktop / PWA
- **React + TypeScript** — type-safe UI
- **Zustand** — minimal, philosophy-preserving state
- **Supabase** — authenticated cloud memory

## Status

Early craft. Public release candidate.
