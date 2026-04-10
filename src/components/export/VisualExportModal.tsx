import { useState } from 'react'
import { generatePaletteSVG, downloadSVG, downloadColorPNGsAsZip, downloadBothAsZip } from '@/lib/exportUtils'
import type { Color, Folder } from '@/types/database'

interface VisualExportModalProps {
  folders: Folder[]
  allColors: Color[]
  selectedColors: Color[]
  onClose: () => void
}

type ExportFormat = 'HEX' | 'RGB' | 'HSL' | 'CMYK'
type IconSize = 64 | 128 | 256
type TargetMode = 'selection' | 'folder'

export function VisualExportModal({ folders, allColors, selectedColors, onClose }: VisualExportModalProps) {
  const hasSelection = selectedColors.length > 0
  const [targetMode, setTargetMode] = useState<TargetMode>(hasSelection ? 'selection' : 'folder')
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all')
  const [format, setFormat] = useState<ExportFormat>('HEX')
  const [iconSize, setIconSize] = useState<IconSize>(64)
  const [exporting, setExporting] = useState(false)

  const targetColors =
    targetMode === 'selection'
      ? selectedColors
      : selectedFolderId === 'all'
        ? allColors
        : allColors.filter((c) => c.folder_id === selectedFolderId)

  const folderName =
    targetMode === 'selection'
      ? 'selected-colors'
      : selectedFolderId === 'all'
        ? 'all-colors'
        : (folders.find((f) => f.id === selectedFolderId)?.name ?? 'palette')

  async function handleExport(type: 'svg' | 'png' | 'both') {
    setExporting(true)
    try {
      if (type === 'svg') {
        const svg = generatePaletteSVG(targetColors, { format, iconSize })
        downloadSVG(svg, `${folderName}-palette.svg`)
      } else if (type === 'png') {
        await downloadColorPNGsAsZip(targetColors, iconSize, folderName)
      } else {
        await downloadBothAsZip(targetColors, { format, iconSize }, folderName)
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface/90 backdrop-blur-md border border-border/50 rounded-xl w-96 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">ビジュアル書き出し</h2>
          <button onClick={onClose} type="button" className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        {/* 書き出し対象の切り替え（複数選択中のみ表示） */}
        {hasSelection && (
          <div>
            <label className="text-xs text-text-muted block mb-1.5">書き出し対象</label>
            <div className="flex rounded overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => setTargetMode('selection')}
                className={['flex-1 py-1.5 text-xs transition-colors', targetMode === 'selection' ? 'bg-accent text-white' : 'bg-surface-raised text-text-muted hover:text-text-primary'].join(' ')}
              >
                選択中の色（{selectedColors.length}色）
              </button>
              <button
                type="button"
                onClick={() => setTargetMode('folder')}
                className={['flex-1 py-1.5 text-xs transition-colors', targetMode === 'folder' ? 'bg-accent text-white' : 'bg-surface-raised text-text-muted hover:text-text-primary'].join(' ')}
              >
                フォルダから選択
              </button>
            </div>
          </div>
        )}

        {/* フォルダ選択（フォルダモード時のみ表示） */}
        {targetMode === 'folder' && (
          <div>
            <label className="text-xs text-text-muted block mb-1.5">対象フォルダ</label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none"
            >
              <option value="all">すべての色（{allColors.length}色）</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}（{allColors.filter((c) => c.folder_id === f.id).length}色）
                </option>
              ))}
            </select>
          </div>
        )}

        {/* カラーコードフォーマット（SVG用） */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">カラーコード形式（SVG）</label>
          <div className="flex gap-2 flex-wrap">
            {(['HEX', 'RGB', 'HSL', 'CMYK'] as ExportFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={[
                  'px-3 py-1 rounded text-xs border transition-colors',
                  format === f
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-text-muted',
                ].join(' ')}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* アイコンサイズ */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">アイコンサイズ</label>
          <div className="flex gap-2">
            {([64, 128, 256] as IconSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setIconSize(s)}
                className={[
                  'px-3 py-1 rounded text-xs border transition-colors',
                  iconSize === s
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-text-muted',
                ].join(' ')}
              >
                {s}px
              </button>
            ))}
          </div>
        </div>

        {/* 色数と形式説明 */}
        <div className="rounded-lg bg-surface-raised border border-border px-3 py-2.5 space-y-1">
          <p className="text-xs text-text-muted">書き出し対象：<span className="text-text-primary">{targetColors.length}色</span></p>
          <p className="text-xs text-text-muted">SVG：縦並びパレット（ベクター形式）</p>
          <p className="text-xs text-text-muted">PNG：透明背景の丸アイコン × {targetColors.length}枚（ZIP）</p>
        </div>

        {/* ダウンロードボタン */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleExport('svg')}
            disabled={exporting || targetColors.length === 0}
            className="flex-1 py-2 rounded bg-surface-raised border border-border text-sm text-text-primary hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            SVG
          </button>
          <button
            type="button"
            onClick={() => handleExport('png')}
            disabled={exporting || targetColors.length === 0}
            className="flex-1 py-2 rounded bg-surface-raised border border-border text-sm text-text-primary hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            PNG (ZIP)
          </button>
          <button
            type="button"
            onClick={() => handleExport('both')}
            disabled={exporting || targetColors.length === 0}
            className="flex-1 py-2 rounded bg-accent text-white text-sm hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? '処理中...' : '両方'}
          </button>
        </div>
      </div>
    </div>
  )
}
