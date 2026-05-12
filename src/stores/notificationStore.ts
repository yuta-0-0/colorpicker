/**
 * notificationStore.ts
 *
 * eventBus の受動的観測者。UI 副作用の唯一の出口。
 *
 * 役割：
 *   eventBus（ドメイン事実）を購読し、toastStore へ変換して通知する。
 *   「何を表示するか」の翻訳層。ドメインロジック禁止。
 *
 * 制約（全て絶対）：
 *   - Supabase 直接接続 禁止
 *   - 状態保持 禁止（購読解除関数のみ保持可）
 *   - eventBus への publish 禁止（受信専用）
 *   - toast 以外の副作用 禁止
 *
 * 接続：
 *   eventBus → notificationStore → toastStore → UI
 */

import { eventBus } from '@/lib/eventBus'
import { useToastStore } from '@/store/toastStore'

/** アプリ起動時に一度だけ呼ぶ。購読を開始する。 */
export function initNotificationStore(): () => void {
  return eventBus.subscribe((event) => {
    const { addToast } = useToastStore.getState()

    switch (event.type) {
      // ── Commit フェーズ（PHASE 4）────────────────────────────────
      case 'color:committed':
        // 保存成功の視覚フィードバックは saveFlash（HeroDot）が担当。
        // toast は出さない（UI ノイズ抑制）。
        break

      case 'color:rejected':
        addToast(event.payload.reason, 'error')
        break

      // ── その他ドメインイベント ────────────────────────────────────
      case 'color:error':
        addToast(event.payload.message, 'error')
        break

      case 'color:trashed':
        addToast('ゴミ箱に移動しました。', 'info')
        break

      case 'color:restored':
        addToast('コレクションに戻しました。', 'success')
        break

      // color:captured / color:intent_changed / color:saved /
      // workspace:undo / workspace:redo は現時点では toast 不要。
      default:
        break
    }
  })
}
