/**
 * workspaceStore.ts
 *
 * WORKSPACE STATE MANAGEMENT
 *
 * 現在の作業領域を保持する層。身体記憶を支える。
 *
 * 責務：
 * - Floating Bar（B状態）の状態管理
 * - Main Color（現在の判断対象）
 * - Swap 状態（以前の色との往復）
 * - Mini Slots（コンテキスト色）
 * - 現在フォーカスされている対象
 *
 * 重要制約：
 * - 長期記憶責務を持たせない（→ memoryStore）
 * - 一時状態を持たせない（→ ephemeralStore）
 * - B（Floating Bar）の「身体記憶」のみ
 * - セッション中の判断対象を保持
 *
 * 将来の移行予定：
 * - floatingStore → workspaceStore
 * - colorStore（の判断対象部分） → workspaceStore
 */

import { create } from 'zustand'

interface WorkspaceState {
  // TODO: 役割コメント追加後、実装を構成していく
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({}))
