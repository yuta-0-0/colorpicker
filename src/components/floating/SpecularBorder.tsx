/**
 * SpecularBorder — ガラス縁の鏡面反射 + エントリ / 保存成功フラッシュ
 *
 * 【哲学】自発光ではなく「反射」
 *   マウス（光源）の位置に連動し、1.4px の断面が外光を拾う。
 *   flash() でエントリ閃光・コピー/保存成功の「鼓動」を表現。
 *
 * 【Step 2: 色の記憶と断面】
 *   accentHex を渡すと、ハイライト色の 30% を現在の選択色と混合する。
 *   これにより「ガラスが色を宿している」質感が生まれる。
 *
 * 【技術】
 *   padding: 1.4px + mask xor = 1.4px の断面だけ gradient が可視。
 *   BASE_OPACITY = 0.25 で常時うっすら面取りが見える（完全に消えない）。
 *
 * 使い方:
 *   const specular = useSpecularReflection({ accentHex: currentColor.hex })
 *
 *   <div onMouseMove={specular.handleMouseMove} onMouseLeave={specular.handleMouseLeave}>
 *     <SpecularBorder borderRadius={20} {...specular} />
 *   </div>
 */
import { motion, useMotionValue, animate, type MotionValue } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'

// ── グラデーション生成（色の記憶混合） ──────────────────────────
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function makeSpecular(x: number, y: number, accentHex?: string): string {
  let highlightColor = 'rgba(255,255,255,0.72)'

  if (accentHex) {
    const rgb = hexToRgb(accentHex)
    if (rgb) {
      // white 70% + accent 30%  （color-mix の JS 実装）
      const r = Math.round(0.70 * 255 + 0.30 * rgb[0])
      const g = Math.round(0.70 * 255 + 0.30 * rgb[1])
      const b = Math.round(0.70 * 255 + 0.30 * rgb[2])
      highlightColor = `rgba(${r},${g},${b},0.72)`
    }
  }

  return (
    `radial-gradient(circle at ${x}% ${y}%, ` +
    `${highlightColor} 0%, ` +
    `rgba(255,255,255,0.24) 30%, ` +
    `rgba(255,255,255,0.07) 58%, ` +
    `transparent 78%)`
  )
}

/** 常時表示するベース不透明度（消えないシャモファー） */
const BASE_OPACITY = 0.28

// ── Hook ────────────────────────────────────────────────────────
export interface SpecularReflectionControls {
  background: MotionValue<string>
  opacity: MotionValue<number>
  handleMouseMove: (e: React.MouseEvent<HTMLElement>) => void
  handleMouseLeave: () => void
  /**
   * 閃光（エントリ・コピー成功・保存成功）。
   * Step 7: Save Flash — brightness 200% ブースト相当
   */
  flash: () => void
}

interface UseSpecularOptions {
  /** 現在選択中の色 HEX（30% 混合でガラスに色の記憶を与える） */
  accentHex?: string
}

export function useSpecularReflection(
  { accentHex }: UseSpecularOptions = {}
): SpecularReflectionControls {
  const background = useMotionValue(makeSpecular(50, 0, accentHex))
  const opacity    = useMotionValue(BASE_OPACITY)
  const isHovering = useRef(false)
  const accentRef  = useRef(accentHex)
  accentRef.current = accentHex

  // accentHex が変わったら非ホバー時のグラデーションを更新
  useEffect(() => {
    if (!isHovering.current) {
      background.set(makeSpecular(50, 0, accentHex))
    }
  }, [accentHex, background])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    isHovering.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    background.set(makeSpecular(x, y, accentRef.current))
    animate(opacity, 1, { duration: 0.12 })
  }, [background, opacity])

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false
    // BASE_OPACITY まで戻す（完全に消えない）
    animate(opacity, BASE_OPACITY, { duration: 0.45, ease: 'easeOut' })
  }, [opacity])

  /**
   * 保存/コピー成功の「鼓動」。
   * Step 7: エッジ輝度を一瞬 200% ブースト → BASE_OPACITY まで自然消灯。
   * ホバー中はフェードアウトをスキップしてホバーグローを維持。
   */
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

  return { background, opacity, handleMouseMove, handleMouseLeave, flash }
}

// ── Component ───────────────────────────────────────────────────
interface SpecularBorderProps {
  borderRadius: number
  background: MotionValue<string>
  opacity: MotionValue<number>
}

/**
 * 親要素に `position: relative` が必要。
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
        // 1.4px 精密面取り（Liquid Glass chamfer — Step 2）
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
