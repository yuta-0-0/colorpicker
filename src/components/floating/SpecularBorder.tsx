/**
 * SpecularBorder — ガラス縁の鏡面反射 + 内部カラーにじみ + エントリ / 保存成功フラッシュ
 *
 * 【哲学】自発光ではなく「反射」
 *   マウス（光源）の位置に連動し、1.4px の断面が外光を拾う。
 *   flash() でエントリ閃光・コピー/保存成功の「鼓動」を表現。
 *
 * 【色の記憶】
 *   accentHex を渡すと、ハイライト色の 40% を白、60% を選択色で混合する。
 *   エッジが選択色を強く纏い、ColorBleed で内部にも柔らかくにじむ。
 *
 * 【技術】
 *   SpecularBorder: padding 1.4px + mask xor = 1.4px 断面のみ gradient が可視。
 *   ColorBleed: 同じ親の中で z-index 1 に配置、マスクなしで内部全体を染める。
 *   BASE_OPACITY = 0.30 で常時うっすら面取りが見える（完全に消えない）。
 */
import { motion, useMotionValue, animate, type MotionValue } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'

// ── HEX → RGB ───────────────────────────────────────────────────────
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
      // 白 40% + 選択色 60% → より濃い色が断面に乗る
      const r = Math.round(0.40 * 255 + 0.60 * rgb[0])
      const g = Math.round(0.40 * 255 + 0.60 * rgb[1])
      const b = Math.round(0.40 * 255 + 0.60 * rgb[2])
      highlightColor = `rgba(${r},${g},${b},0.88)`
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

// ── 内部カラーにじみ（選択色をガラス内部に柔らかく滲出）────────────
function makeInnerGlow(x: number, y: number, accentHex?: string): string {
  if (!accentHex) return 'transparent'
  const rgb = hexToRgb(accentHex)
  if (!rgb) return 'transparent'
  const [r, g, b] = rgb
  return (
    `radial-gradient(ellipse 85% 65% at ${x}% ${y}%, ` +
    `rgba(${r},${g},${b},0.11) 0%, ` +
    `rgba(${r},${g},${b},0.05) 45%, ` +
    `transparent 100%)`
  )
}

/** 常時表示するベース不透明度（消えないシャモファー） */
const BASE_OPACITY = 0.30

// ── Hook ────────────────────────────────────────────────────────────
export interface SpecularReflectionControls {
  background: MotionValue<string>
  opacity: MotionValue<number>
  /** 内部カラーにじみ（ColorBleed コンポーネントに渡す） */
  innerGlow: MotionValue<string>
  handleMouseMove: (e: React.MouseEvent<HTMLElement>) => void
  handleMouseLeave: () => void
  /**
   * 閃光（エントリ・コピー成功・保存成功）。
   * Step 7: Save Flash — brightness 200% ブースト相当
   */
  flash: () => void
}

interface UseSpecularOptions {
  accentHex?: string
}

export function useSpecularReflection(
  { accentHex }: UseSpecularOptions = {}
): SpecularReflectionControls {
  const background = useMotionValue(makeSpecular(50, 0, accentHex))
  const opacity    = useMotionValue(BASE_OPACITY)
  const innerGlow  = useMotionValue(makeInnerGlow(50, 50, accentHex))
  const isHovering = useRef(false)
  const accentRef  = useRef(accentHex)
  accentRef.current = accentHex

  // accentHex が変わったら非ホバー時もグラデーションカラーを更新
  useEffect(() => {
    if (!isHovering.current) {
      background.set(makeSpecular(50, 0, accentHex))
    }
    // 内部にじみは常時色を更新（位置は維持）
    innerGlow.set(makeInnerGlow(50, 50, accentHex))
  }, [accentHex, background, innerGlow])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    isHovering.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    background.set(makeSpecular(x, y, accentRef.current))
    innerGlow.set(makeInnerGlow(x, y, accentRef.current))
    animate(opacity, 1, { duration: 0.12 })
  }, [background, opacity, innerGlow])

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false
    animate(opacity, BASE_OPACITY, { duration: 0.45, ease: 'easeOut' })
    // にじみはフェードせず中央に戻す
    innerGlow.set(makeInnerGlow(50, 50, accentRef.current))
  }, [opacity, innerGlow])

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

  return { background, opacity, innerGlow, handleMouseMove, handleMouseLeave, flash }
}

// ── SpecularBorder ───────────────────────────────────────────────────
interface SpecularBorderProps {
  borderRadius: number
  background: MotionValue<string>
  opacity: MotionValue<number>
}

/**
 * 親要素に `position: relative` + `overflow: hidden` が必要。
 * padding: 1.4px + mask xor = 1.4px の断面のみ gradient が可視化される。
 */
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

// ── ColorBleed ───────────────────────────────────────────────────────
interface ColorBleedProps {
  borderRadius: number
  innerGlow: MotionValue<string>
}

/**
 * ガラス内部への選択色にじみ。
 * マウスに追従し、親の `overflow: hidden` でクリッピングされる。
 * z-index: 1（コンテンツの背後、背景の前面）。
 */
export function ColorBleed({ borderRadius, innerGlow }: ColorBleedProps) {
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius,
        background: innerGlow,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}
