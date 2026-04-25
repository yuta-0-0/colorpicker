// src/components/floating/useTheme.ts
// ライト/ダークモード対応のガラストークンフック
// Electron は nativeTheme.themeSource を React 側から設定するため、
// prefers-color-scheme メディアクエリが浮動ウィンドウでも正しく機能する。
import { useEffect, useState } from 'react'

export function usePrefersDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDark
}

export interface GlassTokens {
  /** メインのグラデーション背景（ガラス面の厚みを表現） */
  background: string
  /** インセットシャドウ（上端ハイライト + 内側光） */
  boxShadow: string
  /** backdropFilter は両モード共通: blur(24px) saturate(180%) */
  textPrimary: string
  textMuted: string
  textExtra: string
  divider: string
  buttonBg: string
  buttonBorder: string
  accentColor: string
  accentBg: string
  accentBorder: string
  /** ドック背景 */
  dockBg: string
  dockBorder: string
}

export function getGlassTokens(isDark: boolean): GlassTokens {
  if (isDark) {
    return {
      background:
        'linear-gradient(180deg, rgba(35,47,68,0.78) 0%, rgba(12,18,34,0.75) 100%)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 14px rgba(255,255,255,0.04)',
      textPrimary: 'rgba(255,255,255,0.85)',
      textMuted: 'rgba(255,255,255,0.42)',
      textExtra: 'rgba(255,255,255,0.28)',
      divider: 'rgba(255,255,255,0.10)',
      buttonBg: 'rgba(255,255,255,0.07)',
      buttonBorder: 'rgba(255,255,255,0.09)',
      accentColor: 'rgba(80,176,211,0.85)',
      accentBg: 'rgba(80,176,211,0.13)',
      accentBorder: 'rgba(80,176,211,0.32)',
      dockBg:
        'linear-gradient(180deg, rgba(22,30,50,0.90) 0%, rgba(10,15,28,0.90) 100%)',
      dockBorder: 'rgba(255,255,255,0.10)',
    }
  }
  return {
    // 上端: 光を受ける白 / 下端: 微青み — 差を縮めて均質なガラス感に
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.63) 0%, rgba(224,232,255,0.57) 100%)',
    // 上端エッジ: 純白フルハイライト（光の当たり面） / 下端エッジ: 青みシャドウ（厚みの底面） / 内部グロー: 透過光
    boxShadow:
      'inset 0 1.5px 0 rgba(255,255,255,1.0), inset 0 -0.5px 0 rgba(180,205,240,0.32), inset 0 0 20px rgba(255,255,255,0.30)',
    textPrimary: 'rgba(10,20,40,0.88)',
    textMuted: 'rgba(10,20,40,0.42)',
    textExtra: 'rgba(10,20,40,0.28)',
    divider: 'rgba(10,20,40,0.09)',
    buttonBg: 'rgba(10,20,40,0.05)',
    buttonBorder: 'rgba(10,20,40,0.09)',
    accentColor: 'rgba(10,62,216,0.85)',
    accentBg: 'rgba(10,62,216,0.10)',
    accentBorder: 'rgba(10,62,216,0.24)',
    dockBg:
      'linear-gradient(170deg, rgba(248,252,255,0.74) 0%, rgba(222,232,255,0.62) 100%)',
    dockBorder: 'rgba(10,20,40,0.10)',
  }
}
