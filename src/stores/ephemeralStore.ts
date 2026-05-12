/**
 * ephemeralStore.ts
 *
 * EPHEMERAL STATE MANAGEMENT
 *
 * 一時状態層。取得 ≠ 保存 を守る層。
 *
 * 責務：
 * - 比較中状態（プレビュー）
 * - 一時的な色取得状態
 * - 未確定データ
 * - 揮発データ（セッション内でのみ有効）
 *
 * 重要制約：
 * - memoryStore / workspaceStore との責務混在禁止
 * - 「取得」と「保存」の境界を明確に保つ
 * - このストアのデータは自動的に消えることを想定
 *
 * 将来の移行予定：
 * - previewStore → ephemeralStore
 */

import { create } from 'zustand'

interface EphemeralState {
  // TODO: 役割コメント追加後、実装を構成していく
}

export const useEphemeralStore = create<EphemeralState>((set) => ({}))
