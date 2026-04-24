/**
 * SpecularBorder — ガラス縁の鏡面反射
 *
 * 【哲学】自発光ではなく「反射」
 *   マウス（光源）の位置に連動し、マウスに最も近いエッジ・コーナーが
 *   外光を受けて白く輝く。連続ループアニメーションは一切ない。
 *
 * 【技術】
 *   radial-gradient を mask xor の 1px フレームに投影。
 *   マウス位置を中心とした放射状グラデーションが境界線に映り込み、
 *   コーナーは隣接する 2 辺の輝度が自然に重なって最輝点になる。
 *
 * 使い方:
 *   const specular = useSpecularReflection()
 *
 *   <div
 *     style={{ position: 'relative' }}
 *     onMouseMove={specular.handleMouseMove}
 *     onMouseLeave={specular.handleMouseLeave}
 *   >
 *     <SpecularBorder borderRadius={20} {...specular} />
 *   </div>
 */
import { motion, useMotionValue, animate, type MotionValue } from 'framer-motion'
import { useCallback } from 'react'

// ── グラデーション生成 ───────────────────────────────────────────
function makeSpecular(x: number, y: number): string {
  return (
    `radial-gradient(circle at ${x}% ${y}%, ` +
    `rgba(255,255,255,0.55) 0%, ` +
    `rgba(255,255,255,0.20) 28%, ` +
    `rgba(255,255,255,0.06) 55%, ` +
    `transparent 75%)`
  )
}

// ── Hook ────────────────────────────────────────────────────────
export interface SpecularReflectionControls {
  background: MotionValue<string>
  opacity: MotionValue<number>
  handleMouseMove: (e: React.MouseEvent<HTMLElement>) => void
  handleMouseLeave: () => void
}

export function useSpecularReflection(): SpecularReflectionControls {
  // background は useTransform を使わず直接 set() することで型問題を回避
  const background = useMotionValue(makeSpecular(-50, -50))
  const opacity    = useMotionValue(0)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    background.set(makeSpecular(x, y))
    animate(opacity, 1, { duration: 0.12 })
  }, [background, opacity])

  const handleMouseLeave = useCallback(() => {
    animate(opacity, 0, { duration: 0.45, ease: 'easeOut' })
  }, [opacity])

  return { background, opacity, handleMouseMove, handleMouseLeave }
}

// ── Component ───────────────────────────────────────────────────
interface SpecularBorderProps {
  borderRadius: number
  background: MotionValue<string>
  opacity: MotionValue<number>
}

/**
 * 親要素に `position: relative` が必要。
 * 親が `overflow: hidden` でも inset:0 なのでクリッピングされない。
 */
export function SpecularBorder({ borderRadius, background, opacity }: SpecularBorderProps) {
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius,
        // padding:1px + mask xor = 1px の境界線フレームだけ gradient が可視化
        padding: 1,
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
