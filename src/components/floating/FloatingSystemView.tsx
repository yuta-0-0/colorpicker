// src/components/floating/FloatingSystemView.tsx
//
// ── HeroDot アーキテクチャ ────────────────────────────────────────────
//   FloatingTab / FloatingToolbar の内部ドットを廃止し、
//   FloatingSystemView が「HeroDot」を直接ホスト。
//   ドットは clip-path に閉じ込められず、常時表示・物理的に移動する。
//
// ── 座標系（80×420px プレリサイズ済みウィンドウ内）───────────────────
//   Tab   ドット: left=10, top=9,  size=14  (center: 17, 16)
//   Toolbar ドット: left=12, top=46, size=24  (center: 24, 58)
//
// ── タイムライン ────────────────────────────────────────────────────
//   A→B: [0-280ms]Tab収束 → [280-480ms]Dot拡大 → [480-630ms]Hold★ → [630-930ms]Dot移動 → [914-1274ms]Toolbar展開
//   B→A: [0ms]Button吸込 ≒ [40-590ms]Toolbar吸収 → [590-790ms]Dot縮小 → [790-940ms]Hold★ → [940-1240ms]Dot移動 → [1224-1404ms]Tab復元

import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Easing } from 'motion-utils'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useEphemeralStore } from '@/stores/ephemeralStore'
import type { FSSyncPayload } from '@/types/floating'
import { FloatingTab } from './FloatingTab'
import { FloatingToolbar, BASE_H, MAX_H } from './FloatingToolbar'
import { usePrefersDark, getGlassTokens } from './useTheme'

// ── HeroDot 座標 ────────────────────────────────────────────────────
const TAB_DOT  = { left: 10, top: 9,  size: 14 } as const
const TOOL_DOT = { left: 12, top: 46, size: 24 } as const

// ── タイミング ──────────────────────────────────────────────────────
const AB_PAUSE = 0.150
const BA_PAUSE = 0.150
const DOT_TRAVEL = 0.300
const DOT_RESIZE = 0.200

const AB_RESIZE_DELAY = 0.280
const AB_TRAVEL_DELAY = AB_RESIZE_DELAY + DOT_RESIZE + AB_PAUSE  // 0.630
const BA_RESIZE_DELAY = 0.550
const BA_TRAVEL_DELAY = BA_RESIZE_DELAY + DOT_RESIZE + BA_PAUSE  // 0.900

const EASE_QUINT: Easing  = [0.8, 0, 0.6, 1] as Easing
const EASE_IN_OUT: Easing = [0.87, 0, 0.13, 1] as Easing

export function FloatingSystemView() {
  const {
    floatingState,
    currentColor,
    setSnapSide,
    setFloatingState,
    syncFromIPC,
    setCurrentColorFromPicker,
    setSyncLocked,
    isBToMainPending,
    setBToMainPending,
  } = useWorkspaceStore()

  const {
    isDotHovered,
    pendingSaveAfterPick,
    setPendingSaveAfterPick,
    saveFlash,
    setEyeActive,
    setExplosionPending,
  } = useEphemeralStore()

  const isDark = usePrefersDark()
  const { accentSolid, accentGlow } = getGlassTokens(isDark)

  const [toolbarHeight, setToolbarHeight] = useState(BASE_H)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const transitionTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoToolbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bToMainTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  // _syncLockUntil を廃止: タイマーはここで管理し setSyncLocked(boolean) で状態更新
  const syncLockTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heroInstantRef      = useRef(false)

  const saveAfterPickRef = useRef(pendingSaveAfterPick)
  useEffect(() => { saveAfterPickRef.current = pendingSaveAfterPick }, [pendingSaveAfterPick])

  const handleHeightChange = useCallback((h: number) => {
    setToolbarHeight(Math.min(MAX_H, Math.max(BASE_H, h)))
  }, [])

  // ── syncLock タイマー管理（_syncLockUntil 廃止の代替）────────────
  const lockSync = useCallback((ms: number) => {
    setSyncLocked(true)
    if (syncLockTimerRef.current) clearTimeout(syncLockTimerRef.current)
    syncLockTimerRef.current = setTimeout(() => {
      syncLockTimerRef.current = null
      setSyncLocked(false)
    }, ms)
  }, [setSyncLocked])

  // IPC: B→Main 直結タイマー
  useEffect(() => {
    if (!isBToMainPending) return
    setBToMainPending(false)
    if (bToMainTimerRef.current) clearTimeout(bToMainTimerRef.current)
    bToMainTimerRef.current = setTimeout(() => {
      bToMainTimerRef.current = null
      window.electronAPI?.requestMainShowFromBDirect?.()
    }, 1100)
  }, [isBToMainPending, setBToMainPending])

  // IPC: snap 位置変化
  useEffect(() => {
    if (!window.electronAPI?.onFloatingSnapChange) return undefined
    return window.electronAPI.onFloatingSnapChange(({ side }) => setSnapSide(side))
  }, [setSnapSide])

  // IPC: 色・履歴・フォルダ同期
  useEffect(() => {
    if (!window.electronAPI?.onFloatingSync) return undefined
    return window.electronAPI.onFloatingSync((raw) => syncFromIPC(raw as FSSyncPayload))
  }, [syncFromIPC])

  // IPC: スクリーンピッカー結果
  useEffect(() => {
    if (!window.electronAPI?.onFloatingColorFromPicker) return undefined
    return window.electronAPI.onFloatingColorFromPicker(({ hex }) => {
      setEyeActive(false)
      if (!hex) return
      setCurrentColorFromPicker(hex)  // workspaceStore: _syncLocked=true をセット
      lockSync(1500)                  // 1500ms 後に解除（Store 外タイマー管理）
      window.electronAPI?.floatingColorSelected(hex)
      if (saveAfterPickRef.current) {
        window.electronAPI?.floatingSaveColor?.({ hex, alpha: 1, name: hex })
        setPendingSaveAfterPick(false)
      }
    })
  }, [setCurrentColorFromPicker, setPendingSaveAfterPick, setEyeActive, lockSync])

  // IPC: main:implosion-start → State A(Tab) 強制リセット
  useEffect(() => {
    if (!window.electronAPI?.onFloatingResetToTab) return undefined
    const unsub = window.electronAPI.onFloatingResetToTab(() => {
      setExplosionPending(false)
      setIsTransitioning(true)
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = setTimeout(() => {
        transitionTimerRef.current = null
        setIsTransitioning(false)
      }, 200)
      heroInstantRef.current = true
      setFloatingState('tab')
      requestAnimationFrame(() => {
        window.electronAPI?.requestFloatingResize({ width: 80, height: 32, anchor: 'center' })
      })
    })
    return () => {
      unsub?.()
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    }
  }, [setFloatingState, setExplosionPending])

  // IPC: ProxyTab outer double-click → A→B Blooming 自動起動
  useEffect(() => {
    if (!window.electronAPI?.onFloatingAutoOpenToolbar) return undefined
    const unsub = window.electronAPI.onFloatingAutoOpenToolbar(() => {
      const screenH = window.screen.availHeight
      window.electronAPI?.requestFloatingResize({ width: 80, height: screenH, anchor: 'top' })
      autoToolbarTimerRef.current = setTimeout(() => {
        setFloatingState('toolbar')
        autoToolbarTimerRef.current = setTimeout(() => {
          const { snapSide } = useWorkspaceStore.getState()
          const anchor = snapSide === 'right' ? 'right' : 'left'
          window.electronAPI?.requestFloatingResize({ width: 48, height: screenH, anchor })
        }, 1700)
      }, 60)
    })
    return () => {
      unsub?.()
      if (autoToolbarTimerRef.current) clearTimeout(autoToolbarTimerRef.current)
    }
  }, [setFloatingState])

  const isToolbar   = floatingState === 'toolbar'
  const dot         = isToolbar ? TOOL_DOT : TAB_DOT
  const delayResize = isToolbar ? AB_RESIZE_DELAY : BA_RESIZE_DELAY
  const delayTravel = isToolbar ? AB_TRAVEL_DELAY : BA_TRAVEL_DELAY

  const isInstant = heroInstantRef.current
  if (isInstant) heroInstantRef.current = false

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: isTransitioning ? 'none' : undefined }}>
      <AnimatePresence mode="popLayout" initial={false}>
        {floatingState === 'tab'
          ? <FloatingTab key="tab" instant={isInstant} />
          : <FloatingToolbar key="toolbar" toolbarHeight={toolbarHeight} onHeightChange={handleHeightChange} />
        }
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={isInstant ? {
          left: TAB_DOT.left, top: TAB_DOT.top,
          width: TAB_DOT.size, height: TAB_DOT.size,
          backgroundColor: currentColor.hex, scale: 1.0,
        } : {
          left: isToolbar
            ? [TAB_DOT.left,  TAB_DOT.left,  TOOL_DOT.left]
            : [TOOL_DOT.left, TOOL_DOT.left, TAB_DOT.left],
          top: isToolbar
            ? [TAB_DOT.top,  TAB_DOT.top  - 4, TOOL_DOT.top]
            : [TOOL_DOT.top, TOOL_DOT.top + 4, TAB_DOT.top],
          width:  dot.size,
          height: dot.size,
          backgroundColor: currentColor.hex,
          scale: !isToolbar && isDotHovered ? 1.1 : 1.0,
          boxShadow: saveFlash
            ? `0 0 0 1.5px ${accentSolid}, 0 0 15px 5px ${accentGlow}`
            : '0 0 0 1.5px rgba(128,128,128,0.35)',
        }}
        transition={isInstant ? {
          left: { duration: 0 }, top: { duration: 0 },
          width: { duration: 0 }, height: { duration: 0 },
          backgroundColor: { duration: 0 }, scale: { duration: 0 },
          boxShadow: { duration: 0 },
        } : {
          left:            { delay: delayTravel, duration: DOT_TRAVEL, ease: EASE_IN_OUT, times: [0, 0.08, 1.0] },
          top:             { delay: delayTravel, duration: DOT_TRAVEL, ease: EASE_IN_OUT, times: [0, 0.08, 1.0] },
          width:           { delay: delayResize, duration: DOT_RESIZE, ease: EASE_QUINT },
          height:          { delay: delayResize, duration: DOT_RESIZE, ease: EASE_QUINT },
          backgroundColor: { duration: 0.2, ease: EASE_QUINT },
          scale:           { type: 'spring', stiffness: 300, damping: 30 },
          boxShadow: saveFlash
            ? { duration: 0.05, ease: 'easeOut' }
            : { duration: 0.8,  ease: 'easeOut' },
        }}
        style={{
          position:        'absolute',
          borderRadius:    '50%',
          zIndex:          100,
          pointerEvents:   'none',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      />
    </div>
  )
}
