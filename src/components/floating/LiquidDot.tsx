// src/components/floating/LiquidDot.tsx
//
// layoutId prop を受け取ることで、FloatingTab ↔ FloatingToolbar 間の
// framer-motion FLIP アニメーション（ドット降下/上昇）を実現する。
import { motion } from 'framer-motion'

interface LiquidDotProps {
  hex: string
  size?: number
  className?: string
  /** framer-motion のレイアウトアニメーション識別子（A↔B ドット降下に使用） */
  layoutId?: string
  style?: React.CSSProperties
  /** layoutId FLIP の開始タイミング・バネを個別制御するためのトランジション */
  layoutTransition?: object
}

export function LiquidDot({ hex, size = 16, className = '', layoutId, style, layoutTransition }: LiquidDotProps) {
  return (
    <motion.div
      layoutId={layoutId}
      initial={{ backgroundColor: hex }}
      animate={{ backgroundColor: hex }}
      transition={{
        backgroundColor: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        ...(layoutTransition ? { layout: layoutTransition } : {}),
      }}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: '0.5px solid rgba(255,255,255,0.25)',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
