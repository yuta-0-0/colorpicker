/**
 * @deprecated
 * historyStore は ephemeralStore に統合されました。
 *
 * 移行先: src/stores/ephemeralStore.ts
 *
 * 旧 API → 新 API:
 *   useHistoryStore().historyColors  → useEphemeralStore().historyColors
 *   useHistoryStore().loadHistory    → useEphemeralStore().loadHistory
 *   useHistoryStore().addToHistory   → useEphemeralStore().addToHistory
 *   useHistoryStore().clearHistory   → useEphemeralStore().clearHistory
 *
 * このファイルは段階移行期間中のみ残します。
 * 全コンポーネントの import 更新後に削除します。
 */

export { useEphemeralStore as useHistoryStore } from '@/stores/ephemeralStore'
