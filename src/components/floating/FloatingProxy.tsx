// src/components/floating/FloatingProxy.tsx
//
// ── ProxyDocking アーキテクチャ ────────────────────────────────────────
//   メインウィンドウが表示中は本物の FloatingWindow は hide() されている。
//   このコンポーネントが AppLayout 内で「本物の FloatingTab」を完璧に模倣する。
//
// ── ビジュアル同一性 ─────────────────────────────────────────────────
//   FloatingTab と全く同じガラス・1.4px エッジ・ドット構成。
//   Implosion 発火の瞬間に、同座標で本物の FloatingWindow が show() され
//   ユーザーには「板が雫を吸収して解放された」ようにしか見えない。
//
// ── 配置 ──────────────────────────────────────────────────────────────
//   left: sidebarWidth + 20   top: (40 - 32) / 2 = 4px（ドラッグバー上下等分）

import { useCallback } from 'react'
import { SpecularBorder, ColorBleed, useSpecularReflection } from './SpecularBorder'
import { usePrefersDark, getGlassTokens } from './useTheme'

interface FloatingProxyProps {
  /** ProxyTab の left 位置（= dockOffsetX = sidebarWidth + 20） */
  left: number
  /** ドット色（現在選択中の HEX） */
  hex: string
}

export function FloatingProxy({ left, hex }: FloatingProxyProps) {
  const isDark  = usePrefersDark()
  const glass   = getGlassTokens(isDark)
  const specular = useSpecularReflection({ accentHex: hex })

  // ドットダブルクリック → Implosion 開始（floatingWin が ProxyTab 座標に出現する）
  const handleDotDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    window.electronAPI?.triggerImplosionFromDock?.()
  }, [])

  return (
    <div
      onMouseMove={specular.handleMouseMove}
      onMouseLeave={specular.handleMouseLeave}
      style={{
        position: 'absolute',
        left,
        top: 4,          // (40 - 32) / 2 = 4px — ドラッグバー内上下均等
        width: 80,
        height: 32,
        zIndex: 20,
        borderRadius: 20,
        background: glass.background,
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: glass.boxShadow,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 10,
        gap: 8,
        userSelect: 'none',
        WebkitAppRegion: 'no-drag',  // クリックイベントを受け取るため
        cursor: 'default',
        overflow: 'hidden',
        flexShrink: 0,
      } as React.CSSProperties}
    >
      {/* 内部カラーにじみ（FloatingTab と同一） */}
      <ColorBleed
        borderRadius={20}
        innerGlow={specular.innerGlow}
        innerGlowOpacity={specular.innerGlowOpacity}
      />
      {/* 1.4px 鏡面反射シャモファー（FloatingTab と同一） */}
      <SpecularBorder
        borderRadius={20}
        background={specular.background}
        opacity={specular.opacity}
      />
      {/* カラードット（FloatingTab の HeroDot に相当 — ここでは直接描画） */}
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
    </div>
  )
}
