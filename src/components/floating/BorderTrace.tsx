/**
 * BorderTrace — 境界線を走る光（Reactive Border Trace）
 *
 * 使い方:
 *   const trace = useBorderTrace()   // autoRun=true: mount時に自動発火
 *   <div style={{ position:'relative' }} onMouseEnter={trace.run}>
 *     <BorderTrace borderRadius={20} {...trace} />
 *   </div>
 *
 * 仕組み:
 *   conic-gradient の from 角度を 0→360° アニメーション → 光の頭が縁を一周
 *   padding:1px + WebkitMask xor → 1px 幅のフレームだけ gradient を表示（= 走る光）
 *   borderColor は親の framer-motion animate が別途制御（競合しない）
 */
import { motion, useMotionValue, useTransform, animate, type MotionValue } from 'framer-motion'
import { useEffect, useCallback, useRef } from 'react'

// ── コメット型グラデーション（明るい頭 + 尾引き） ──────────────
function makeComet(a: number): string {
  return (
    `conic-gradient(from ${a}deg at 50% 50%, ` +
    // 頭（白青・最輝点）
    `rgba(230,248,255,0.95) 0deg, ` +
    // 頭の直後（強いシアン）
    `rgba(80,176,211,0.70) 5deg, ` +
    // なだらかな尾
    `rgba(80,176,211,0.22) 15deg, ` +
    `transparent 24deg, ` +
    // ほとんどの範囲は透明
    `transparent 338deg, ` +
    // 頭の手前（わずかな前光）
    `rgba(80,176,211,0.08) 350deg, ` +
    `rgba(80,176,211,0.40) 357deg, ` +
    // 頭（wrap）
    `rgba(230,248,255,0.95) 360deg)`
  )
}

// ── Hook ────────────────────────────────────────────────────────
export interface BorderTraceControls {
  background: MotionValue<string>
  opacity: MotionValue<number>
  run: () => void
}

export function useBorderTrace(autoRun = true): BorderTraceControls {
  const angle   = useMotionValue(0)
  const opacity = useMotionValue(0)
  const busy    = useRef(false)

  const run = useCallback(() => {
    if (busy.current) return
    busy.current = true

    // フェードイン → スイープ → フェードアウト
    animate(opacity, 1, { duration: 0.05 })
    angle.set(0)
    animate(angle, 360, {
      duration: 0.65,
      ease: 'linear',
      onComplete: () => {
        animate(opacity, 0, {
          duration: 0.35,
          ease: 'easeOut',
          onComplete: () => { busy.current = false },
        })
      },
    })
  }, [angle, opacity])

  // mount 時に自動発火（State A/B への遷移エフェクト）
  useEffect(() => {
    if (!autoRun) return
    const t = setTimeout(run, 60)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const background = useTransform(angle, makeComet)

  return { background, opacity, run }
}

// ── Component ───────────────────────────────────────────────────
interface BorderTraceProps {
  borderRadius: number
  background: MotionValue<string>
  opacity: MotionValue<number>
}

/**
 * 親要素に `position: relative` が必要。
 * overflow: hidden があっても inset:0 なので clipping されない。
 */
export function BorderTrace({ borderRadius, background, opacity }: BorderTraceProps) {
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius,
        // padding:1px + xor マスク = 1px 幅のフレームにだけ gradient が見える
        padding: 1,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
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
