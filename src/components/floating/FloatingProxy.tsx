// src/components/floating/FloatingProxy.tsx
//
// ── ProxyDocking アーキテクチャ ────────────────────────────────────────
//   メインウィンドウが表示中は本物の FloatingWindow は hide() されている。
//   このコンポーネントが AppLayout 内で「本物の FloatingTab」を完璧に模倣する。
//
// ── ビジュアル同一性 ─────────────────────────────────────────────────
//   FloatingTab と全く同じガラス・1.4px エッジ（常時 opacity:1）・ドット構成。
//   Implosion 発火の瞬間に、同座標で本物の FloatingWindow が show() され
//   ユーザーには「板が雫を吸収して解放された」ようにしか見えない。
//
// ── 配置（光学中心 7px）──────────────────────────────────────────────
//   left: sidebarWidth + 20   top: 7px
//   ドラッグバー 40px, Bento 開始 46px → 上空気 7px / 下空気 7px（均等）
//
// ── z-index ──────────────────────────────────────────────────────────
//   drag bar: z-10 (Tailwind=10) → FloatingProxy: 50 で完全制圧
//   DOM 順序も drag bar の後ろに配置（Electron no-drag 判定の安全策）
//
// ── ダブルクリック回路 ───────────────────────────────────────────────
//   outer div double-click → proxy:open-toolbar → floatingWin show + fs:auto-open-toolbar
//   dot   double-click     → e.stopPropagation() → Implosion（母艦へ戻る）

import { useCallback } from 'react'
import { SpecularBorder, ColorBleed, useSpecularReflection } from './SpecularBorder'
import { usePrefersDark, getGlassTokens } from './useTheme'

interface FloatingProxyProps {
  /** ProxyTab の left 位置（= sidebarWidth + 20） */
  left: number
  /** ドット色（現在選択中の HEX） */
  hex: string
}

export function FloatingProxy({ left, hex }: FloatingProxyProps) {
  const isDark  = usePrefersDark()
  const glass   = getGlassTokens(isDark)
  // baseOpacity: 1.0 → 主ウィンドウの暗い背景と同化しないよう常時フル発光
  const specular = useSpecularReflection({ accentHex: hex, baseOpacity: 1.0 })

  // ── outer ダブルクリック: A→B（Toolbar を開く）─────────────────────
  // floatingWin を ProxyTab 座標に show() → fs:auto-open-toolbar で Blooming 開始
  const handleOuterDoubleClick = useCallback(() => {
    window.electronAPI?.proxyOpenToolbar?.()
  }, [])

  // ── dot ダブルクリック: Implosion（母艦へ戻る）──────────────────────
  // e.stopPropagation() で outer の handleOuterDoubleClick と衝突させない
  const handleDotDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    window.electronAPI?.triggerImplosionFromDock?.()
  }, [])

  return (
    <div
      onDoubleClick={handleOuterDoubleClick}
      onMouseMove={specular.handleMouseMove}
      onMouseLeave={specular.handleMouseLeave}
      style={{
        position: 'absolute',
        left,
        // 光学中心 7px: 上空気 7px / 下空気（Bento top 46px - bottom 39px）= 7px
        top: 7,
        width: 80,
        height: 32,
        // drag bar の z-10（=10）を 50 で完全制圧。DOM 順序とのダブル保険。
        zIndex: 50,
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
        // no-drag: クリック・ダブルクリックイベントを確実に受け取る
        WebkitAppRegion: 'no-drag',
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
      {/* 1.4px 鏡面反射シャモファー（baseOpacity:1.0 で常時フル発光） */}
      <SpecularBorder
        borderRadius={20}
        background={specular.background}
        opacity={specular.opacity}
      />
      {/* カラードット: FloatingTab の HeroDot に相当（no-drag + stopPropagation）*/}
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
