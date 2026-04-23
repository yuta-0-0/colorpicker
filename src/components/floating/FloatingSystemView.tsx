// src/components/floating/FloatingSystemView.tsx
import { useEffect } from 'react'
import { useFloatingStore } from '@/store/floatingStore'
import type { FSSyncPayload } from '@/types/floating'
import { FloatingTab } from './FloatingTab'
import { FloatingToolbar } from './FloatingToolbar'

export function FloatingSystemView() {
  const { floatingState, setFloatingState, setSnapSide, syncFromIPC } = useFloatingStore()

  // IPC: snap 状態変化
  useEffect(() => {
    if (!window.electronAPI?.onFloatingSnapChange) return undefined
    const unsub = window.electronAPI.onFloatingSnapChange(({ side }) => {
      setSnapSide(side)
      if (side !== 'none') {
        setFloatingState('toolbar')
        window.electronAPI?.requestFloatingResize({ width: 48, height: 320 })
      } else {
        setFloatingState('tab')
        window.electronAPI?.requestFloatingResize({ width: 80, height: 32 })
      }
    })
    return unsub
  }, [setSnapSide, setFloatingState])

  // IPC: 色・履歴・フォルダ同期
  useEffect(() => {
    if (!window.electronAPI?.onFloatingSync) return undefined
    const unsub = window.electronAPI.onFloatingSync((raw) => {
      syncFromIPC(raw as FSSyncPayload)
    })
    return unsub
  }, [syncFromIPC])

  if (floatingState === 'tab') return <FloatingTab />
  return <FloatingToolbar />
}
