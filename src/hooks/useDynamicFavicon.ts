import { useEffect } from 'react'

export function useDynamicFavicon(hex: string | null) {
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 32, 32)
    ctx.beginPath()
    ctx.arc(16, 16, 14, 0, Math.PI * 2)

    if (hex) {
      ctx.fillStyle = hex
      ctx.fill()
      // 微妙な内側シャドウ効果（境界線）
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else {
      // デフォルト: アクセントカラー
      ctx.fillStyle = '#0a3ed8'
      ctx.fill()
    }

    const dataUrl = canvas.toDataURL('image/png')
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = dataUrl
  }, [hex])
}
