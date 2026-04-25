// src/components/floating/FloatingSystemView.tsx
//
// LayoutGroup: FloatingTab と FloatingToolbar の layoutId="fs-active-dot" を
// framer-motion に認識させ、A↔B 遷移時にドットが物理的に降下・上昇する
// （Step 1: Iris Morphing — 核の不滅 + 降下シーケンス）

import { useEffect, useRef } from 'react'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
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

  // pendingSaveAfterPick を ref で追う（useEffect のクロージャ問題を防ぐ）
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

  // IPC: スクリーンピッカー結果（Step 6: 長押し保存フラグ対応）
  useEffect(() => {
    if (!window.electronAPI?.onFloatingColorFromPicker) return undefined
    const unsub = window.electronAPI.onFloatingColorFromPicker(({ hex }) => {
      if (!hex) return  // キャンセル時は何もしない
      setCurrentColorFromPicker(hex)
      if (saveAfterPickRef.current) {
        window.electronAPI?.floatingColorSelected(hex)
        setPendingSaveAfterPick(false)
      }
    })
    return unsub
  }, [setCurrentColorFromPicker, setPendingSaveAfterPick])

  return (
    // LayoutGroup: Tab と Toolbar の "fs-active-dot" layoutId を橋渡し
    // → A→B 遷移時: Tab の dot が Toolbar の row-2 位置へ物理的に降下
    // → B→A 遷移時: Toolbar の dot が Tab の位置へ物理的に上昇
    <LayoutGroup>
      {/* initial={false}: 初回マウント時は iris アニメーションをスキップ */}
      <AnimatePresence initial={false}>
        {floatingState === 'tab'
          ? <FloatingTab key="tab" />
          : <FloatingToolbar key="toolbar" />
        }
      </AnimatePresence>
    </LayoutGroup>
  )
}
