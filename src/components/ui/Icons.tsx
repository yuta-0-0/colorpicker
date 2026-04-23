/**
 * Icons — @phosphor-icons/react のラッパー
 * アプリ内の全アイコンはここから import すること。
 * @phosphor-icons/react への直接 import はこのファイルのみ。
 *
 * weight prop: 'regular'（デフォルト）/ 'fill'（アクティブ状態）
 */
export {
  // ── 3×3 グリッド ──────────────────────────────────────────
  SquaresFour    as IconSquaresFour,    // すべての色
  Star           as IconStar,           // お気に入り（fill でアクティブ）
  MagicWand      as IconMagicWand,      // カラージェネレーター
  ImageSquare    as IconImageSquare,    // 画像から抽出
  Eyedropper     as IconEyedropper,     // スクリーンピッカー
  PlusCircle     as IconPlusCircle,     // 色を追加
  Layout         as IconLayout,         // Web プレビュー
  CircleHalf     as IconCircleHalf,     // コントラストチェッカー
  Swatches       as IconSwatches,       // フィルター / 並び順

  // ── ボトムドック ──────────────────────────────────────────
  Trash          as IconTrash,
  DownloadSimple as IconDownloadSimple,
  Sun            as IconSun,
  Moon           as IconMoon,

  // ── サイドバー Chrome ─────────────────────────────────────
  SidebarSimple    as IconSidebarSimple,
  MagnifyingGlass  as IconMagnifyingGlass,
  CaretRight       as IconCaretRight,
  FolderSimple     as IconFolder,
  Tag              as IconTag,
  Clock            as IconClock,
  Palette          as IconPalette,
  TrendUp          as IconTrendUp,
  Archive          as IconArchive,

  // ── アクション ───────────────────────────────────────────
  Plus                as IconPlus,
  X                   as IconX,
  Copy                as IconCopy,
  Check               as IconCheck,
  ArrowsLeftRight     as IconArrowsLeftRight,  // スワップボタン
  CaretDown           as IconCaretDown,        // ドロップダウン矢印
  ArrowUpRight        as IconArrowUpRight,     // 適用ボタン
  Pencil              as IconPencil,
  Lock                as IconLock,
  LockOpen            as IconLockOpen,
  ArrowUUpLeft        as IconArrowUUpLeft,       // アーカイブ解除（復元）
  ArrowBendDownRight  as IconArrowBendDownRight,  // サブフォルダ追加
  NotePencil          as IconNotePencil,          // メモ拡大編集
  FloppyDisk          as IconFloppyDisk,          // 保存

  // ── FAB / BulkActionBar ──────────────────────────────────
  Sparkle          as IconSparkle,
  Monitor          as IconMonitor,
  FolderSimplePlus as IconFolderSimplePlus,       // フォルダへ移動

  // ── ソート ───────────────────────────────────────────────
  ArrowUp   as IconSortAsc,
  ArrowDown as IconSortDesc,

  // ── 警告 ─────────────────────────────────────────────────
  WarningCircle  as IconWarningCircle,
} from '@phosphor-icons/react'

export type { Icon as PhosphorIcon } from '@phosphor-icons/react'
