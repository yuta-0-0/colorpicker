/**
 * eventBus.ts
 *
 * 神経伝達のみ。状態保持しない。
 *
 * 役割：
 *   memoryStore（ドメイン）と UI副作用層の間の疎結合伝達路。
 *   「事実の発行」と「観測」のみ担当する。
 *
 * 制約（全て絶対）：
 *   - Zustand 禁止
 *   - 永続化 禁止
 *   - ログ出力 禁止
 *   - グローバル state 保持 禁止（購読者配列の管理のみ可）
 *
 * 構造：
 *   memoryStore → publish → eventBus → subscribe → notificationStore → UI
 */

export type AppEvent =
  | { type: 'color:captured';  payload: { hex: string } }
  | { type: 'color:saved';     payload: { id: string; hex: string } }
  | { type: 'color:error';     payload: { message: string } }
  | { type: 'color:trashed';   payload: { id: string } }
  | { type: 'color:restored';  payload: { id: string } }
  | { type: 'workspace:undo';  payload: Record<string, never> }
  | { type: 'workspace:redo';  payload: Record<string, never> }

type Handler = (event: AppEvent) => void

// 購読者リスト（唯一許可されるモジュールレベル変数）
const handlers: Set<Handler> = new Set()

export const eventBus = {
  /** 事実を発行する。状態は保持しない。 */
  publish(event: AppEvent): void {
    handlers.forEach((h) => h(event))
  },

  /**
   * 購読する。
   * @returns unsubscribe 関数（useEffect の cleanup で必ず呼ぶこと）
   */
  subscribe(handler: Handler): () => void {
    handlers.add(handler)
    return () => handlers.delete(handler)
  },
}
