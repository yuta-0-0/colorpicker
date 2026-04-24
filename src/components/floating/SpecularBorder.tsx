/**
 * SpecularBorder — ガラス縁の鏡面反射 + エントリ / コピー成功フラッシュ
 *
 * 【哲学】自発光ではなく「反射」
 *   マウス（光源）の位置に連動し、近接エッジが外光を受けて輝く。
 *   flash() は外部から呼び出し可能。
 *   コピー成功・コンポーネント出現時の「一瞬の閃光」に使う。
 *
 * 【技術】
 *   padding: 1.4px の精密な面取りフレーム（Liquid Glass chamfer）。
 *   radial-gradient を mask xor で 1.4px 境界線に投影。
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
import { useCallback, useRef } from 'react'

// ── グラデーション生成 ───────────────────────────────────────────
function makeSpecular(x: number, y: number): string {
  return (
    `radial-gradient(circle at ${x}% ${y}%, ` +
    `rgba(255,255,255,0.65) 0%, ` +
    `rgba(255,255,255,0.22) 28%, ` +
    `rgba(255,255,255,0.07) 55%, ` +
    `transparent 75%)`
  )
}

// ── Hook ────────────────────────────────────────────────────────
export interface SpecularReflectionControls {
  background: MotionValue<string>
  opacity: MotionValue<number>
  handleMouseMove: (e: React.MouseEvent<HTMLElement>) => void
  handleMouseLeave: () => void
  /** エントリ閃光・コピー成功閃光（上方光源から一瞬当てて消える） */
  flash: () => void
}

export function useSpecularReflection(): SpecularReflectionControls {
  const background = useMotionValue(makeSpecular(50, 0))
  const opacity    = useMotionValue(0)
  const isHovering = useRef(false)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    isHovering.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    background.set(makeSpecular(x, y))
    animate(opacity, 1, { duration: 0.12 })
  }, [background, opacity])

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false
    animate(opacity, 0, { duration: 0.45, ease: 'easeOut' })
  }, [opacity])

  /**
   * 上方から閃光 → opacity 0.90 → 0 で自然消灯。
   * ホバー中に呼ばれた場合はフェードアウトをスキップし、ホバーグローを維持。
   */
  const flash = useCallback(() => {
    background.set(makeSpecular(50, 0))
    animate(opacity, 0.90, {
      duration: 0.05,
      onComplete: () => {
        if (!isHovering.current) {
          animate(opacity, 0, { duration: 0.70, ease: 'easeOut' })
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
 * padding: 1.4px + mask xor = 1.4px の面取りフレームだけ gradient が可視化。
 */
export function SpecularBorder({ borderRadius, background, opacity }: SpecularBorderProps) {
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius,
        // 1.4px 精密面取り（Liquid Glass chamfer）
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
