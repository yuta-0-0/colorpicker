/**
 * Prism Tile — Electron専用常時最前面ミニウィンドウ（320×140px）
 * URL: ?prism-tile=1 のときにルーティング
 *
 * 機能:
 * - 最新色の大型カラースウォッチ表示
 * - HEX / CMYK のコピーボタン
 * - CMYK色域警告（ガマット警告）
 * - スポイト起動ボタン
 * - ドラッグで移動
 */

import { useState, useEffect, useCallback } from 'react'

interface ColorData {
  hex: string
  alpha: number
  name: string
  hasGamutWarning: boolean
}

declare global {
  interface Window {
    electronAPI?: {
      startScreenPicker: () => Promise<null>
      platform: string
      openPrismTile: () => Promise<void>
      closePrismTile: () => Promise<void>
      pushColorToPrismTile: (data: ColorData) => void
      onPrismTileColorUpdated: (cb: (data: ColorData) => void) => () => void
    }
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return [r, g, b]
}

function getLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    // fallback
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  })
}

export function PrismTileView() {
  const [color, setColor] = useState<ColorData>({
    hex: '#3A7BD5',
    alpha: 1.0,
    name: 'カラーピッカー',
    hasGamutWarning: false,
  })
  const [copied, setCopied] = useState<string | null>(null)

  // Electron IPC で色の更新を購読
  useEffect(() => {
    if (!window.electronAPI?.onPrismTileColorUpdated) return
    const unsubscribe = window.electronAPI.onPrismTileColorUpdated((data) => {
      setColor(data)
    })
    return unsubscribe
  }, [])

  const handleCopy = useCallback((text: string, key: string) => {
    copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }, [])

  const handleScreenPicker = useCallback(() => {
    window.electronAPI?.startScreenPicker()
  }, [])

  const handleClose = useCallback(() => {
    window.electronAPI?.closePrismTile()
  }, [])

  const [r, g, b] = hexToRgb(color.hex)
  const luminance = getLuminance(r, g, b)
  const isDark = luminance < 0.4
  const textColor = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)'
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)'
  const btnBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'
  const btnHover = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.18)'

  return (
    <div
      className="prism-tile-root"
      style={{
        width: '320px',
        height: '140px',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        background: color.hex,
        boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      } as React.CSSProperties}
    >
      {/* 閉じるボタン */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: 'none',
          background: btnBg,
          color: textMuted,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          WebkitAppRegion: 'no-drag',
          transition: 'background 0.15s',
        } as React.CSSProperties}
        onMouseEnter={(e) => { (e.currentTarget.style.background = btnHover) }}
        onMouseLeave={(e) => { (e.currentTarget.style.background = btnBg) }}
        title="閉じる"
      >
        ✕
      </button>

      {/* ガマット警告 */}
      {color.hasGamutWarning && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 10,
            background: 'rgba(255, 180, 0, 0.85)',
            color: '#000',
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 6,
            letterSpacing: '0.02em',
          }}
        >
          ⚠ 色域外
        </div>
      )}

      {/* メインコンテンツ */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '10px 12px',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {/* 色名 */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: textColor,
            margin: 0,
            marginBottom: 6,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {color.name}
        </p>

        {/* ボタン行 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* HEXコピー */}
          <button
            onClick={() => handleCopy(color.hex, 'hex')}
            style={{
              background: btnBg,
              border: 'none',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 500,
              color: textColor,
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'background 0.15s',
              letterSpacing: '0.04em',
              minWidth: 80,
            }}
            onMouseEnter={(e) => { (e.currentTarget.style.background = btnHover) }}
            onMouseLeave={(e) => { (e.currentTarget.style.background = btnBg) }}
          >
            {copied === 'hex' ? '✓ コピー済' : color.hex}
          </button>

          {/* RGB */}
          <button
            onClick={() => handleCopy(`rgb(${r}, ${g}, ${b})`, 'rgb')}
            style={{
              background: btnBg,
              border: 'none',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              color: textMuted,
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget.style.background = btnHover) }}
            onMouseLeave={(e) => { (e.currentTarget.style.background = btnBg) }}
          >
            {copied === 'rgb' ? '✓' : 'RGB'}
          </button>

          {/* スポイトボタン（Macのみ） */}
          {window.electronAPI?.platform === 'darwin' && (
            <button
              onClick={handleScreenPicker}
              style={{
                marginLeft: 'auto',
                background: btnBg,
                border: 'none',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 14,
                cursor: 'pointer',
                color: textColor,
                transition: 'background 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onMouseEnter={(e) => { (e.currentTarget.style.background = btnHover) }}
              onMouseLeave={(e) => { (e.currentTarget.style.background = btnBg) }}
              title="スクリーンピッカー"
            >
              🎨
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
