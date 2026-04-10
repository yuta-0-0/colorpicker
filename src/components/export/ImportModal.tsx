import { useState, useRef } from 'react'
import { parseImportJSON, parseImportCSV, parseImportASE } from '@/lib/importUtils'
import { useColorStore } from '@/store/colorStore'
import { useUIStore } from '@/store/uiStore'

interface ImportModalProps {
  onClose: () => void
}

type ImportFileFormat = 'JSON' | 'CSV' | 'ASE'

export function ImportModal({ onClose }: ImportModalProps) {
  const { addColor } = useColorStore()
  const { activeFolderId } = useUIStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileFormat, setFileFormat] = useState<ImportFileFormat>('JSON')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)

  const accept =
    fileFormat === 'JSON' ? '.json' :
    fileFormat === 'CSV' ? '.csv' :
    '.ase'

  async function handleFile(file: File) {
    setImporting(true)
    setResult(null)

    try {
      let colors: { hex: string; name: string; alpha: number }[] = []
      let errors: string[] = []

      if (fileFormat === 'JSON' || fileFormat === 'CSV') {
        const text = await file.text()
        const parsed = fileFormat === 'JSON' ? parseImportJSON(text) : parseImportCSV(text)
        colors = parsed.colors
        errors = parsed.errors
      } else {
        const buffer = await file.arrayBuffer()
        const parsed = parseImportASE(buffer)
        colors = parsed.colors
        errors = parsed.errors
      }

      let imported = 0
      for (const c of colors) {
        await addColor(c.hex, c.alpha ?? 1.0, activeFolderId)
        imported++
      }

      setResult({ imported, errors })
    } catch (e) {
      setResult({ imported: 0, errors: [`読み込みエラー: ${e}`] })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface/90 backdrop-blur-md border border-border/50 rounded-xl w-96 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">インポート</h2>
          <button onClick={onClose} type="button" className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        {/* 形式選択 */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">ファイル形式</label>
          <div className="flex gap-2">
            {(['JSON', 'CSV', 'ASE'] as ImportFileFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setFileFormat(f); setResult(null) }}
                className={[
                  'flex-1 py-2 rounded text-xs border transition-colors',
                  fileFormat === f
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-text-muted',
                ].join(' ')}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ファイル選択 */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="w-full py-3 rounded border-2 border-dashed border-border hover:border-accent text-sm text-text-muted hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? 'インポート中...' : 'ファイルを選択してインポート'}
          </button>
        </div>

        {/* 結果表示 */}
        {result && (
          <div className="space-y-2">
            {result.imported > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded">
                <span className="text-green-400 text-xs">✓</span>
                <p className="text-xs text-green-300">{result.imported}色をインポートしました</p>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-yellow-300">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
