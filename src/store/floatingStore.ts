/**
 * floatingStore.ts
 *
 * Floating Window の薄い Adapter 層。
 *
 * PHASE 2 移行後の責務:
 *   判断状態は workspaceStore へ移管済み。
 *   このストアは「ドット hover のみ」を保持する最小実装。
 *
 * @deprecated 将来的に完全削除し useWorkspaceStore に統合予定。
 */

import { create } from 'zustand'

interface FloatingStore {
  /** FloatingTab ドット上にマウスが乗っている（HeroDot scale 1.1 用） */
  isDotHovered: boolean
  setDotHovered: (v: boolean) => void
}

export const useFloatingStore = create<FloatingStore>((set) => ({
  isDotHovered: false,
  setDotHovered: (isDotHovered) => set({ isDotHovered }),
}))
