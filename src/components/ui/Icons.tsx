/**
 * SVG icon components — 16×16 viewBox, currentColor, strokeWidth 1.5
 * Designed for dark-mode use at text-sm/text-base sizes.
 */

interface IconProps {
  className?: string
  size?: number
}

const defaults = (p: IconProps) => ({
  width: p.size ?? 16,
  height: p.size ?? 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: p.className,
  'aria-hidden': true as const,
})

// ── Navigation ──────────────────────────────────────────────────────────────

/** すべての色 */
export function IconGrid(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <circle cx="5" cy="5" r="1.75" />
      <circle cx="11" cy="5" r="1.75" />
      <circle cx="5" cy="11" r="1.75" />
      <circle cx="11" cy="11" r="1.75" />
    </svg>
  )
}

/** お気に入り（空） */
export function IconStar(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M8 2l1.545 3.13L13 5.635l-2.5 2.436.59 3.44L8 9.75l-3.09 1.761.59-3.44L3 5.635l3.455-.505L8 2z" />
    </svg>
  )
}

/** お気に入り（塗り） */
export function IconStarFilled(p: IconProps) {
  return (
    <svg {...defaults(p)} fill="currentColor" stroke="none">
      <path d="M8 2l1.545 3.13L13 5.635l-2.5 2.436.59 3.44L8 9.75l-3.09 1.761.59-3.44L3 5.635l3.455-.505L8 2z" />
    </svg>
  )
}

/** 履歴・時計 */
export function IconClock(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.25l2 1.5" />
    </svg>
  )
}

/** カラージェネレーター・スパークル */
export function IconSparkle(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" strokeWidth={1.75} />
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
      <path d="M4.22 4.22l1.06 1.06M10.72 10.72l1.06 1.06M4.22 11.78l1.06-1.06M10.72 5.28l1.06-1.06" strokeWidth={1.25} />
    </svg>
  )
}

/** UIテスト・モニター */
export function IconMonitor(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <rect x="2" y="2.5" width="12" height="8.5" rx="1.5" />
      <path d="M5.5 14h5M8 11v3" />
    </svg>
  )
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

/** ハンバーガーメニュー */
export function IconMenu(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
    </svg>
  )
}

/** 縦3点リーダー */
export function IconDotsVertical(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <circle cx="8" cy="3.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** 横3点リーダー */
export function IconDotsHorizontal(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <circle cx="3.5" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** ダウンロード */
export function IconDownload(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M8 2.5v7M5 7l3 3 3-3" />
      <path d="M3 11.5v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
    </svg>
  )
}

// ── Actions ──────────────────────────────────────────────────────────────────

/** コピー */
export function IconCopy(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <rect x="5.5" y="5.5" width="7.5" height="8.5" rx="1.5" />
      <path d="M10.5 5.5V4a1 1 0 0 0-1-1H3.5A1 1 0 0 0 2.5 4v7.5a1 1 0 0 0 1 1H5.5" />
    </svg>
  )
}

/** チェックマーク */
export function IconCheck(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M2.5 8.5l3.5 3.5 7-7.5" strokeWidth={1.75} />
    </svg>
  )
}

/** ✕ 閉じる・削除 */
export function IconX(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </svg>
  )
}

/** 鉛筆（編集） */
export function IconPencil(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M10.5 3l2.5 2.5-7.5 7.5H3v-2.5L10.5 3z" />
    </svg>
  )
}

// ── State icons ──────────────────────────────────────────────────────────────

/** ロック（施錠） */
export function IconLock(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" />
      <path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" />
    </svg>
  )
}

/** アンロック（開錠） */
export function IconLockOpen(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" />
      <path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0" strokeDasharray="1 0" />
      <path d="M10.5 5.5V4" />
    </svg>
  )
}

/** アーカイブ（格納） */
export function IconArchive(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M2 4.5h12v1.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5z" />
      <path d="M3 7v5.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7" />
      <path d="M6 10h4" />
    </svg>
  )
}

/** アーカイブ解除（取り出し） */
export function IconArchiveOut(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M2 4.5h12v1.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5z" />
      <path d="M3 7v5.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7" />
      <path d="M8 12.5v-4M6 10.5l2-2 2 2" />
    </svg>
  )
}

// ── UI Chrome ────────────────────────────────────────────────────────────────

/** シェブロン 下 */
export function IconChevronDown(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M4 6.5l4 4 4-4" />
    </svg>
  )
}

/** シェブロン 右 */
export function IconChevronRight(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M6.5 4l4 4-4 4" />
    </svg>
  )
}

/** ソート昇順 */
export function IconSortAsc(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M8 11.5V4.5M5 7.5l3-3 3 3" />
    </svg>
  )
}

/** ソート降順 */
export function IconSortDesc(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M8 4.5v7M5 8.5l3 3 3-3" />
    </svg>
  )
}

/** フォルダ */
export function IconFolder(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M2 4.5a1 1 0 0 1 1-1h3l1.5 2H13a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5z" />
    </svg>
  )
}

/** タグ */
export function IconTag(p: IconProps) {
  return (
    <svg {...defaults(p)}>
      <path d="M2.5 8.5L7.5 3.5h4.5a1 1 0 0 1 1 1v4.5l-5 5a1 1 0 0 1-1.5 0l-4.5-4.5a1 1 0 0 1 0-1z" />
      <circle cx="11" cy="6" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
