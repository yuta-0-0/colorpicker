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
import { useFloatingStore } from '@/store/floatingStore'
import type { FSSyncPayload } from '@/types/floating'
import { FloatingTab } from './FloatingTab'
import { FloatingToolbar, BASE_H, MAX_H } from './FloatingToolbar'
import { usePrefersDark, getGlassTokens } from './useTheme'

// ── HeroDot 座標 ────────────────────────────────────────────────────
const TAB_DOT  = { left: 10, top: 9,  size: 14 } as const  // Tab dot top-left + size
const TOOL_DOT = { left: 12, top: 46, size: 24 } as const  // Toolbar dot top-left + size

// ── タイミング ──────────────────────────────────────────────────────
const AB_PAUSE = 0.150  // Hold: 拡大完了→移動開始の静止時間
const BA_PAUSE = 0.150  // Hold: 縮小完了→移動開始の静止時間
const DOT_TRAVEL   = 0.300   // 移動 duration
const DOT_RESIZE   = 0.200   // サイズ変化 duration（ゆっくり）

// A→B: resize は Tab exit(280ms) 完了と同時にスタート
const AB_RESIZE_DELAY = 0.280
// A→B: travel は resize(200ms) + Hold(150ms) 後
const AB_TRAVEL_DELAY = AB_RESIZE_DELAY + DOT_RESIZE + AB_PAUSE  // 0.630

// B→A: resize は 背景収束(550ms) 完了後にスタート（縮小が先）
const BA_RESIZE_DELAY = 0.550  // = BA_EXIT_DUR(0.55)
// B→A: travel は resize(200ms) + Hold(150ms) 後（移動が後）
const BA_TRAVEL_DELAY = BA_RESIZE_DELAY + DOT_RESIZE + BA_PAUSE  // 0.900

const EASE_QUINT: Easing   = [0.8, 0, 0.6, 1] as Easing   // とろっと：出だし・着地ともに極限まで緩やか
const EASE_IN_OUT: Easing  = [0.87, 0, 0.13, 1] as Easing // ドット移動：ゆったり出発、溶けるように着地

export function FloatingSystemView() {
  const {
    floatingState,
    currentColor,
    isDotHovered,
    setSnapSide,
    setFloatingState,
    syncFromIPC,
    setCurrentColorFromPicker,
    pendingSaveAfterPick,
    setPendingSaveAfterPick,
    isBToMainPending,
    setBToMainPending,
    saveFlash,
    setEyeActive,
    setExplosionPending,
  } = useFloatingStore()

  const isDark                   = usePrefersDark()
  const { accentSolid, accentGlow } = getGlassTokens(isDark)

  const [toolbarHeight, setToolbarHeight] = useState(BASE_H)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleHeightChange = useCallback((h: number) => {
    const clamped = Math.min(MAX_H, Math.max(BASE_H, h))
    setToolbarHeight(clamped)
  }, [])

  const saveAfterPickRef    = useRef(pendingSaveAfterPick)
  // auto-open-toolbar タイマー（proxy:open-toolbar → A→B Blooming）
  const autoToolbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // B→Main 直結タイマー（FloatingToolbar アンマウント後も継続させるため FloatingSystemView が保持）
  const bToMainTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  // onFloatingResetToTab 時に HeroDot を瞬間移動させるフラグ（B状態からリセットで位置ズレ防止）
  const heroInstantRef      = useRef(false)
  useEffect(() => {
    saveAfterPickRef.current = pendingSaveAfterPick
  }, [pendingSaveAfterPick])

  // IPC: B→Main 直結タイマー（FloatingToolbar の cleanup に消されないようここで管理）
  useEffect(() => {
    if (!isBToMainPending) return
    setBToMainPending(false)  // フラグ即クリア（二重起動防止）
    if (bToMainTimerRef.current) clearTimeout(bToMainTimerRef.current)
    // BA_ENTER_DELAY=1184ms の直前に Main を起動（ガラスカプセル出現前）
    bToMainTimerRef.current = setTimeout(() => {
      bToMainTimerRef.current = null
      window.electronAPI?.requestMainShowFromBDirect?.()
    }, 1100)
  // setBToMainPending は安定した関数参照なので deps に含めても問題なし
  }, [isBToMainPending, setBToMainPending])

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

  // IPC: スクリーンピッカー結果
  useEffect(() => {
    if (!window.electronAPI?.onFloatingColorFromPicker) return undefined
    const unsub = window.electronAPI.onFloatingColorFromPicker(({ hex }) => {
      setEyeActive(false)  // キャンセル含め必ずリセット
      if (!hex) return
      setCurrentColorFromPicker(hex)  // HeroDot 即反映 + 1500ms sync ロック
      window.electronAPI?.floatingColorSelected(hex)  // 常時: 履歴追加 + 再同期
      if (saveAfterPickRef.current) {
        window.electronAPI?.floatingSaveColor?.({ hex, alpha: 1, name: hex })  // 長押し: ライブラリ保存
        setPendingSaveAfterPick(false)
      }
    })
    return unsub
  }, [setCurrentColorFromPicker, setPendingSaveAfterPick, setEyeActive])

  // IPC: main:implosion-start → State A(Tab) 強制リセット
  // Implosion アニメーション中に floatingWin を State A(Tab/80×32) へ戻す。
  // show() 時点で State B(Toolbar)のままにならないための事前リセット。
  // heroInstantRef=true にして HeroDot をアニメなしで TAB_DOT に瞬間移動させる。
  useEffect(() => {
    if (!window.electronAPI?.onFloatingResetToTab) return undefined
    const unsub = window.electronAPI.onFloatingResetToTab(() => {
      // explosionPending を先にクリア（instant FloatingTab の onAnimationComplete が
      // 即座に発火しても requestMainShowFromFloating が呼ばれないようにする）
      setExplosionPending(false)
      // 遷移中フラグ: 200ms だけ pointer-events:none にして誤タップを防ぐ
      setIsTransitioning(true)
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = setTimeout(() => {
        transitionTimerRef.current = null
        setIsTransitioning(false)
      }, 200)
      heroInstantRef.current = true  // 次レンダー1回だけ instant モード
      setFloatingState('tab')
      // RAF で React コミット（FloatingToolbar → FloatingTab の DOM 切り替え）完了後に
      // resize を送る。サイズ確定 → 中身描画の順を保証し Main→A 1発帰還を実現。
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
  // main.ts から floatingWin に fs:auto-open-toolbar が届いたら
  // FloatingTab の handleDoubleClick と完全に同一のシーケンスを実行する。
  //
  //   t=0ms    : requestFloatingResize(80×420) ← ウィンドウ高さ展開
  //   t=60ms   : setFloatingState('toolbar')   ← Blooming アニメーション開始
  //   t=60+1700: requestFloatingResize(48×420) ← 幅トリム（TRIM_DELAY と同値）
  //
  // FloatingSystemView がオーナーになることで FloatingTab の cleanup と競合しない。
  useEffect(() => {
    if (!window.electronAPI?.onFloatingAutoOpenToolbar) return undefined
    const unsub = window.electronAPI.onFloatingAutoOpenToolbar(() => {
      // Step 1: 高さを画面高に拡張しトップへ吸着（先に window を広げる）
      const screenH = window.screen.availHeight
      window.electronAPI?.requestFloatingResize({ width: 80, height: screenH, anchor: 'top' })
      // Step 2: 60ms 後に state 変更 → HeroDot + clip-path アニメーション開始
      autoToolbarTimerRef.current = setTimeout(() => {
        setFloatingState('toolbar')
        // Step 3: TRIM — FloatingToolbar の AB_ENTER から十分後（TRIM_DELAY=1700ms）
        autoToolbarTimerRef.current = setTimeout(() => {
          const { snapSide } = useFloatingStore.getState()
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

  // onFloatingResetToTab 時: このレンダーのみ instant モードを消費して次は通常に戻す
  // setFloatingState('tab') が同時に呼ばれるため再レンダーは保証される
  const isInstant = heroInstantRef.current
  if (isInstant) heroInstantRef.current = false

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: isTransitioning ? 'none' : undefined }}>
      {/* mode="popLayout": Tab exit と Toolbar mount が同時進行 → HeroDot が物理移動できる */}
      <AnimatePresence mode="popLayout" initial={false}>
        {floatingState === 'tab'
          ? <FloatingTab key="tab" instant={isInstant} />
          : <FloatingToolbar key="toolbar" toolbarHeight={toolbarHeight} onHeightChange={handleHeightChange} />
        }
      </AnimatePresence>

      {/* ── HeroDot: コンポーネントの制約から解放されたドット ────────
          ・常時レンダリング（消えない・途切れない）
          ・floatingState 変化後 delay 秒で物理的に移動・サイズ変化
          ・isInstant=true 時は即時移動（onFloatingResetToTab でのズレ防止）
          ・pointerEvents none = 下要素の drag・click を透過          */}
      <motion.div
        initial={false}
        animate={isInstant ? {
          // 瞬間リセット: TAB_DOT に即座にジャンプ（B→A 中の位置ズレ防止）
          left: TAB_DOT.left, top: TAB_DOT.top,
          width: TAB_DOT.size, height: TAB_DOT.size,
          backgroundColor: currentColor.hex, scale: 1.0,
        } : {
          // left: top と完全同一の times/ease で補間 → レーザー直線軌道
          left: isToolbar
            ? [TAB_DOT.left,  TAB_DOT.left,  TOOL_DOT.left]
            : [TOOL_DOT.left, TOOL_DOT.left, TAB_DOT.left],
          // 移動の溜め: 逆方向に 4px 引いてから発射
          top: isToolbar
            ? [TAB_DOT.top,  TAB_DOT.top  - 4, TOOL_DOT.top]
            : [TOOL_DOT.top, TOOL_DOT.top + 4, TAB_DOT.top],
          width:  dot.size,
          height: dot.size,
          // 保存フラッシュ: アクセントカラーに一瞬光ってから元色に戻る
          backgroundColor: currentColor.hex,
          scale: !isToolbar && isDotHovered ? 1.1 : 1.0,
          // ⑤ Bento Bloom Save: 1.5px リング + 半径15px の霧が 0.8s でじわっと消える
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
          // saveFlash ON: 瞬時点灯 / OFF: 0.8s でじわっと消える
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
