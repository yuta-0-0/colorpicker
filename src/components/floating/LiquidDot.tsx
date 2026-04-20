// src/components/floating/LiquidDot.tsx
import { motion } from 'framer-motion'

interface LiquidDotProps {
  hex: string
  size?: number
  className?: string
}

export function LiquidDot({ hex, size = 16, className = '' }: LiquidDotProps) {
  return (
    <motion.div
      animate={{ backgroundColor: hex }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '0.5px solid rgba(255,255,255,0.25)',
        flexShrink: 0,
      }}
    />
  )
}
