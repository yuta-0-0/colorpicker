/**
 * settingsStore.ts
 *
 * SETTINGS & UI CONFIGURATION
 *
 * 設定・UI管理層。ユーザー環境設定を扱う。
 *
 * 責務：
 * - UI レイアウト設定（ダーク/ライト）
 * - 表示状態（サイドバー開閉、パネル配置）
 * - ショートカット設定
 * - ユーザー設定（言語、デフォルト値）
 * - UI トーンの通知（Toast）
 *
 * 重要制約：
 * - 「判断」に関わる機能設定は含まない
 * - 見た目・操作性のみに限定
 * - localStorage で永続化可能
 *
 * 将来の移行予定：
 * - uiStore → settingsStore
 * - toastStore → settingsStore
 */

import { create } from 'zustand'

interface SettingsState {
  // TODO: 役割コメント追加後、実装を構成していく
}

export const useSettingsStore = create<SettingsState>((set) => ({}))
