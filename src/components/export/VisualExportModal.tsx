import { useState } from 'react'
import { generatePaletteSVG, downloadSVG, downloadPNG } from '@/lib/exportUtils'
import type { Color, Folder } from '@/types/database'

interface VisualExportModalProps {
  folders: Folder[]
  allColors: Color[]
  onClose: () => void
}

type ExportFormat = 'HEX' | 'RGB' | 'HSL' | 'CMYK'
type IconSize = 64 | 128 | 256
type DPI = 72 | 150 | 300

export function VisualExportModal({ folders, allColors, onClose }: VisualExportModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all')
  const [format, setFormat] = useState<ExportFormat>('HEX')
  const [iconSize, setIconSize] = useState<IconSize>(64)
  const [dpi, setDpi] = useState<DPI>(72)
  const [exporting, setExporting] = useState(false)

  const targetColors =
    selectedFolderId === 'all'
      ? allColors
      : allColors.filter((c) => c.folder_id === selectedFolderId)

  const folderName =
    selectedFolderId === 'all'
      ? 'all-colors'
      : (folders.find((f) => f.id === selectedFolderId)?.name ?? 'palette')

  async function handleExport(type: 'svg' | 'png' | 'both') {
    setExporting(true)
    const svg = generatePaletteSVG(targetColors, { format, iconSize })
    const filename = `${folderName}-palette`
    try {
      if (type === 'svg' || type === 'both') downloadSVG(svg, `${filename}.svg`)
      if (type === 'png' || type === 'both') await downloadPNG(svg, `${filename}.png`, dpi)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl w-96 p-6 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">ビジュアル書き出し</h2>
          <button onClick={onClose} type="button" className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        {/* フォルダ選択 */}
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

        {/* カラーコードフォーマット */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">カラーコード形式</label>
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

        {/* PNG 解像度 */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">PNG 解像度</label>
          <div className="flex gap-2">
            {([72, 150, 300] as DPI[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDpi(d)}
                className={[
                  'px-3 py-1 rounded text-xs border transition-colors',
                  dpi === d
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-text-muted',
                ].join(' ')}
              >
                {d} dpi
              </button>
            ))}
          </div>
        </div>

        {/* 色数表示 */}
        <p className="text-xs text-text-muted">
          書き出し対象：{targetColors.length}色
        </p>

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
            PNG
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
