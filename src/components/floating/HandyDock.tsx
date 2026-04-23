// src/components/floating/HandyDock.tsx
// Stub — will be implemented in Task 8
import type { SnapSide } from '@/types/floating'

interface HandyDockProps {
  snapSide: SnapSide
}

export function HandyDock({ snapSide: _ }: HandyDockProps) {
  return (
    <div
      style={{
        width: 320,
        height: 280,
        borderRadius: 16,
        background: 'rgba(18, 24, 38, 0.70)',
      }}
    />
  )
}
