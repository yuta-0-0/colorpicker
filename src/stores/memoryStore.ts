/**
 * memoryStore.ts
 *
 * LONG-TERM MEMORY MANAGEMENT
 *
 * 長期記憶層。単なるDB ではなく「判断記憶」を扱う層として設計。
 *
 * 責務：
 * - 保存済み色（Gallery）
 * - 履歴（History）— 時系列の判断記録
 * - タグ・フォルダ分類 — 判断カテゴリ化
 * - メモ・コンテキスト — 判断の背景
 * - 再訪データ（Last accessed, frequency）
 *
 * 重要制約：
 * - 「色の大量管理」ではなく「判断の記録と再接続」
 * - Supabase RLS による個人のプライベート記憶
 * - IndexedDB によるローカルキャッシュ
 * - 削除時も判断記録として保持する可能性
 *
 * 将来の移行予定：
 * - colorStore（の保存済み部分） → memoryStore
 * - historyStore → memoryStore
 * - folderStore → memoryStore
 * - tagStore → memoryStore
 */

import { create } from 'zustand'

interface MemoryState {
  // TODO: 役割コメント追加後、実装を構成していく
}

export const useMemoryStore = create<MemoryState>(() => ({}))
