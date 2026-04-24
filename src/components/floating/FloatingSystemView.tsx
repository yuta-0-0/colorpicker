// src/components/floating/FloatingSystemView.tsx
//
// Step 5/6: スポイト長押しフラグ（pendingSaveAfterPick）に応じて
//           picker 結果受信時に自動保存を行う

import { useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useFloatingStore } from '@/store/floatingStore'
import type { FSSyncPayload } from '@/types/floating'
import { FloatingTab } from './FloatingTab'
import { FloatingToolbar } from './FloatingToolbar'

export function FloatingSystemView() {
  const {
    floatingState,
    setSnapSide,
    syncFromIPC,
    setCurrentColorFromPicker,
    pendingSaveAfterPick,
    setPendingSaveAfterPick,
  } = useFloatingStore()

  // pendingSaveAfterPick を useEffect のクロージャに閉じ込めず ref で追う
  const saveAfterPickRef = useRef(pendingSaveAfterPick)
  useEffect(() => {
    saveAfterPickRef.current = pendingSaveAfterPick
  }, [pendingSaveAfterPick])

  // IPC: snap 位置変化
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

  // IPC: スクリーンピッカー結果を受信（Step 5/6）
  // 長押しフラグが立っていれば自動保存も行う
  useEffect(() => {
    if (!window.electronAPI?.onFloatingColorFromPicker) return undefined
    const unsub = window.electronAPI.onFloatingColorFromPicker(({ hex }) => {
      if (!hex) return  // キャンセル時は何もしない（Step 6: 状態は B のまま）
      setCurrentColorFromPicker(hex)
      // Step 5: 長押し保存フラグが立っていれば即時保存
      if (saveAfterPickRef.current) {
        window.electronAPI?.floatingColorSelected(hex)
        setPendingSaveAfterPick(false)
      }
    })
    return unsub
  }, [setCurrentColorFromPicker, setPendingSaveAfterPick])

  return (
    // initial={false}: 初回マウント時は iris アニメーションをスキップ
    <AnimatePresence initial={false}>
      {floatingState === 'tab'
        ? <FloatingTab key="tab" />
        : <FloatingToolbar key="toolbar" />
      }
    </AnimatePresence>
  )
}
