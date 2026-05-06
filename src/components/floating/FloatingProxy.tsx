// src/components/floating/FloatingProxy.tsx
//
// ── Stretching Handoff アーキテクチャ対応版 ────────────────────────────
//   メインウィンドウ表示中はカプセルの枠線・ガラスは見せず、ドットのみ表示。
//   ガラス層（ヘッダー）は AppLayout の headerClipControls motion.div が担当。
//   このコンポーネントは「ドットの存在 + ダブルクリック回路」のみを担当する。
//
// ── ダブルクリック回路 ───────────────────────────────────────────────
//   outer double-click → onImplosionTrigger → Implosion → Toolbar（A→B）
//   dot   double-click → e.stopPropagation → onImplosionTrigger → Implosion（単純復帰）

import { useCallback } from 'react'
import { motion } from 'framer-motion'

// サイドバー開閉アニメーションと同一トークン（AppLayout PANEL_TRANSITION と揃える）
const PANEL_TRANSITION = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }

interface FloatingProxyProps {
  /** ProxyTab の left 位置（collapsed: min 140 / 通常: sidebarWidth + 20） */
  left: number
  /** ドット色（現在選択中の HEX） */
  hex: string
  /** サイドバーリサイズ中は true → transition を duration:0 にしてガタつきを防ぐ */
  isResizing?: boolean
  /**
   * Implosion アニメーションを即座に開始するコールバック（AppLayout から注入）。
   * relX / relY はウィンドウ幅・高さに対するドット中心の % 座標。
   */
  onImplosionTrigger?: (relX: number, relY: number) => void
}

export function FloatingProxy({ left, hex, isResizing, onImplosionTrigger }: FloatingProxyProps) {
  // ── ProxyTab ドット中心の相対座標を即計算（IPC 往復なし）──────────
  // ドット center X: left(capsule left) + paddingLeft(10) + dot radius(7) = left + 17
  // ドット center Y: capsule top(7) + capsule height/2(16) = 23px from window top
  const getDotRelCoords = useCallback(() => ({
    relX: Math.max(0, Math.min(100, ((left + 17) / window.innerWidth)  * 100)),
    relY: Math.max(0, Math.min(100, (23           / window.innerHeight) * 100)),
  }), [left])

  // ── outer ダブルクリック: Implosion → A→B（Toolbar を開く）──────────
  const handleOuterDoubleClick = useCallback(() => {
    const { relX, relY } = getDotRelCoords()
    onImplosionTrigger?.(relX, relY)
    window.electronAPI?.proxyOpenToolbar?.()
  }, [getDotRelCoords, onImplosionTrigger])

  // ── dot ダブルクリック: Implosion（単純復帰）──────────────────────
  const handleDotDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const { relX, relY } = getDotRelCoords()
    onImplosionTrigger?.(relX, relY)
    window.electronAPI?.triggerImplosionFromDock?.()
  }, [getDotRelCoords, onImplosionTrigger])

  return (
    <motion.div
      // サイドバー開閉に追従して left をアニメーション
      initial={false}
      animate={{ left }}
      transition={isResizing ? { duration: 0 } : PANEL_TRANSITION}
      onDoubleClick={handleOuterDoubleClick}
      style={{
        position: 'absolute',
        top: 0,
        height: 40,
        // ドット + クリック領域として機能する最小幅
        width: 80,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 10,
        // drag bar の z-10（=10）を 50 で制圧
        zIndex: 50,
        userSelect: 'none',
        WebkitAppRegion: 'no-drag',
        cursor: 'default',
        flexShrink: 0,
      } as React.CSSProperties}
    >
      {/* カラードット: ヘッダーに溶け込む「不動の核」
          ガラス枠・背景は Stretching Handoff 時のヘッダーガラスが担当するため省略。
          normal state ではドットのみがヘッダーに浮かんで見える。 */}
      <div
        onDoubleClick={handleDotDoubleClick}
        style={{
          position: 'relative',
          zIndex: 1,
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: hex,
          flexShrink: 0,
          cursor: 'default',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      />
    </motion.div>
  )
}
