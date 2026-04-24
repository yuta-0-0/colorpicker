// src/components/floating/FloatingSystemView.tsx
import { useEffect } from 'react'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { useFloatingStore } from '@/store/floatingStore'
import type { FSSyncPayload } from '@/types/floating'
import { FloatingTab } from './FloatingTab'
import { FloatingToolbar } from './FloatingToolbar'

export function FloatingSystemView() {
  const { floatingState, setSnapSide, syncFromIPC, setCurrentColorFromPicker } = useFloatingStore()

  // IPC: snap 位置変化（State morphing はダブルクリックで行う）
  useEffect(() => {
    if (!window.electronAPI?.onFloatingSnapChange) return undefined
    const unsub = window.electronAPI.onFloatingSnapChange(({ side }) => {
      setSnapSide(side)
    })
    return unsub
  }, [setSnapSide])

  // IPC: 色・履歴・フォルダ同期
  useEffect(() => {
    if (!window.electronAPI?.onFloatingSync) return undefined
    const unsub = window.electronAPI.onFloatingSync((raw) => {
      syncFromIPC(raw as FSSyncPayload)
    })
    return unsub
  }, [syncFromIPC])

  // IPC: スクリーンピッカーで取得した色を受信（Floating → picker → Floating）
  useEffect(() => {
    if (!window.electronAPI?.onFloatingColorFromPicker) return undefined
    const unsub = window.electronAPI.onFloatingColorFromPicker(({ hex }) => {
      setCurrentColorFromPicker(hex)
    })
    return unsub
  }, [setCurrentColorFromPicker])

  return (
    // LayoutGroup + AnimatePresence（mode 省略 = "sync"）
    // layoutId="floating-frame" による Tab↔Toolbar モーフを正しく機能させる
    <LayoutGroup>
      <AnimatePresence>
        {floatingState === 'tab'
          ? <FloatingTab key="tab" />
          : <FloatingToolbar key="toolbar" />
        }
      </AnimatePresence>
    </LayoutGroup>
  )
}
