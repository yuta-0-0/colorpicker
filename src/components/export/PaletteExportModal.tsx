import { useState } from 'react'
import { downloadCSV, downloadPaletteJSON, downloadASE } from '@/lib/exportUtils'
import type { Color, Folder } from '@/types/database'

interface PaletteExportModalProps {
  folders: Folder[]
  allColors: Color[]
  onClose: () => void
}

type ExportFileFormat = 'CSV' | 'JSON' | 'ASE'

export function PaletteExportModal({ folders, allColors, onClose }: PaletteExportModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all')
  const [fileFormat, setFileFormat] = useState<ExportFileFormat>('CSV')

  const targetColors =
    selectedFolderId === 'all'
      ? allColors
      : allColors.filter((c) => c.folder_id === selectedFolderId)

  const folderName =
    selectedFolderId === 'all'
      ? 'all-colors'
      : (folders.find((f) => f.id === selectedFolderId)?.name ?? 'palette')

  function handleDownload() {
    const filename = `${folderName}-palette`
    switch (fileFormat) {
      case 'CSV': downloadCSV(targetColors, `${filename}.csv`); break
      case 'JSON': downloadPaletteJSON(targetColors, `${filename}.json`); break
      case 'ASE': downloadASE(targetColors, `${filename}.ase`); break
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface/90 backdrop-blur-md border border-border/50 rounded-xl w-96 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">パレット書き出し</h2>
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

        {/* 形式選択 */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">ファイル形式</label>
          <div className="flex gap-2">
            {(['CSV', 'JSON', 'ASE'] as ExportFileFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFileFormat(f)}
                className={[
                  'flex-1 py-2 rounded text-xs border transition-colors',
                  fileFormat === f
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-text-muted',
                ].join(' ')}
              >
                {f}
                {f === 'CSV' && <span className="block text-text-muted mt-0.5">汎用</span>}
                {f === 'JSON' && <span className="block text-text-muted mt-0.5">バックアップ</span>}
                {f === 'ASE' && <span className="block text-text-muted mt-0.5">Illustrator</span>}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-text-muted">書き出し対象：{targetColors.length}色</p>

        <button
          type="button"
          onClick={handleDownload}
          disabled={targetColors.length === 0}
          className="w-full py-2 rounded bg-accent text-white text-sm hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ダウンロード
        </button>
      </div>
    </div>
  )
}
