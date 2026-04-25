/**
 * SpecularBorder — ガラス縁の鏡面反射 + 内部カラーにじみ + エントリ / 保存成功フラッシュ
 *
 * 【哲学】自発光ではなく「反射」
 *   マウス（光源）の位置に連動し、1.4px の断面が外光を拾う。
 *
 * 【ColorBleed — 外縁から滲み込む色の動き】
 *   ・マウスが来たときだけ出現（opacity 0 → 1 を 0.35s でにじわっと）
 *   ・マウスが去ると最後の位置からゆっくりフェード（0.50s）
 *   ・グラデーション中心 = マウス位置 → エッジ付近を触ると縁から滲む感覚
 *
 * 【技術】
 *   SpecularBorder: padding 1.4px + mask xor = 1.4px 断面のみ可視
 *   ColorBleed: z-index 1, overflow:hidden でクリップ, opacity MotionValue で制御
 */
import { motion, useMotionValue, animate, type MotionValue } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'

// ── HEX → RGB ────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ── エッジ鏡面グラデーション（白 40% + 選択色 60%）────────────────
function makeSpecular(x: number, y: number, accentHex?: string): string {
  let highlightColor = 'rgba(255,255,255,0.80)'
  if (accentHex) {
    const rgb = hexToRgb(accentHex)
    if (rgb) {
      // white 55% + accent 45%（前回より白を増やして抑制）
      const r = Math.round(0.55 * 255 + 0.45 * rgb[0])
      const g = Math.round(0.55 * 255 + 0.45 * rgb[1])
      const b = Math.round(0.55 * 255 + 0.45 * rgb[2])
      highlightColor = `rgba(${r},${g},${b},0.78)`
    }
  }
  return (
    `radial-gradient(circle at ${x}% ${y}%, ` +
    `${highlightColor} 0%, ` +
    `rgba(255,255,255,0.28) 28%, ` +
    `rgba(255,255,255,0.08) 55%, ` +
    `transparent 75%)`
  )
}

// ── 内部カラーにじみ（マウス位置 = 光の入射点、そこから内側へ染み込む）
// ellipse を小さめにして「縁から広がる」感を出す
function makeInnerGlow(x: number, y: number, accentHex?: string): string {
  if (!accentHex) return 'transparent'
  const rgb = hexToRgb(accentHex)
  if (!rgb) return 'transparent'
  const [r, g, b] = rgb
  return (
    `radial-gradient(ellipse 55% 40% at ${x}% ${y}%, ` +
    `rgba(${r},${g},${b},0.16) 0%, ` +
    `rgba(${r},${g},${b},0.07) 50%, ` +
    `transparent 100%)`
  )
}

const BASE_OPACITY = 0.30

// ── Hook ─────────────────────────────────────────────────────────────
export interface SpecularReflectionControls {
  background: MotionValue<string>
  opacity: MotionValue<number>
  innerGlow: MotionValue<string>
  /** マウスが来たときだけ 0→1 にアニメ、離れると 1→0（にじわっと制御用） */
  innerGlowOpacity: MotionValue<number>
  handleMouseMove: (e: React.MouseEvent<HTMLElement>) => void
  handleMouseLeave: () => void
  flash: () => void
}

interface UseSpecularOptions {
  accentHex?: string
}

export function useSpecularReflection(
  { accentHex }: UseSpecularOptions = {}
): SpecularReflectionControls {
  const background       = useMotionValue(makeSpecular(50, 0, accentHex))
  const opacity          = useMotionValue(BASE_OPACITY)
  const innerGlow        = useMotionValue(makeInnerGlow(50, 50, accentHex))
  // にじみは最初は完全透明
  const innerGlowOpacity = useMotionValue(0)

  const isHovering = useRef(false)
  const accentRef  = useRef(accentHex)
  accentRef.current = accentHex

  // accentHex が変わったら色だけ更新（opacity は変えない）
  useEffect(() => {
    if (!isHovering.current) {
      background.set(makeSpecular(50, 0, accentHex))
    }
    innerGlow.set(makeInnerGlow(50, 50, accentHex))
  }, [accentHex, background, innerGlow])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const wasHovering = isHovering.current
    isHovering.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100

    // エッジ反射: 即座に追従
    background.set(makeSpecular(x, y, accentRef.current))
    animate(opacity, 1, { duration: 0.12 })

    // にじみ: グラデーション位置を更新
    innerGlow.set(makeInnerGlow(x, y, accentRef.current))
    // 初回進入時だけ「にじわっと」フェードイン
    if (!wasHovering) {
      animate(innerGlowOpacity, 1, { duration: 0.35, ease: 'easeOut' })
    }
  }, [background, opacity, innerGlow, innerGlowOpacity])

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false
    // エッジ: BASE_OPACITY まで戻す
    animate(opacity, BASE_OPACITY, { duration: 0.45, ease: 'easeOut' })
    // にじみ: 最後の位置からゆっくりフェードアウト（位置はリセットしない）
    animate(innerGlowOpacity, 0, { duration: 0.50, ease: 'easeOut' })
  }, [opacity, innerGlowOpacity])

  const flash = useCallback(() => {
    background.set(makeSpecular(50, 0, accentRef.current))
    animate(opacity, 1.0, {
      duration: 0.04,
      onComplete: () => {
        if (!isHovering.current) {
          animate(opacity, BASE_OPACITY, { duration: 0.65, ease: 'easeOut' })
        }
      },
    })
  }, [background, opacity])

  return { background, opacity, innerGlow, innerGlowOpacity, handleMouseMove, handleMouseLeave, flash }
}

// ── SpecularBorder ────────────────────────────────────────────────────
interface SpecularBorderProps {
  borderRadius: number
  background: MotionValue<string>
  opacity: MotionValue<number>
}

export function SpecularBorder({ borderRadius, background, opacity }: SpecularBorderProps) {
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius,
        padding: 1.4,
        WebkitMask:
          'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor' as React.CSSProperties['WebkitMaskComposite'],
        maskComposite: 'exclude' as React.CSSProperties['maskComposite'],
        background,
        opacity,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  )
}

// ── ColorBleed ────────────────────────────────────────────────────────
interface ColorBleedProps {
  borderRadius: number
  innerGlow: MotionValue<string>
  innerGlowOpacity: MotionValue<number>
}

/**
 * マウスが来たときだけ縁から滲み込む選択色の光。
 * innerGlowOpacity が 0→1 にアニメすることで「にじわっと」現れる。
 */
export function ColorBleed({ borderRadius, innerGlow, innerGlowOpacity }: ColorBleedProps) {
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius,
        background: innerGlow,
        opacity: innerGlowOpacity,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}
