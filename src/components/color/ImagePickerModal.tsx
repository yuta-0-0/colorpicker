import { useState, useRef, useEffect } from 'react'
import { getPaletteSync } from 'colorthief'
import { ColorSwatch } from './ColorSwatch'
import { useColorStore } from '@/store/colorStore'
import { useUIStore } from '@/store/uiStore'

interface ImagePickerModalProps {
  onClose: () => void
}

export function ImagePickerModal({ onClose }: ImagePickerModalProps) {
  const { addColor } = useColorStore()
  const { activeFolderId } = useUIStore()

  // 共有: アップロード済み画像
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)

  // スポイト
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgElementRef = useRef<HTMLImageElement | null>(null)
  const [eyedropperHex, setEyedropperHex] = useState<string | null>(null)
  const [savingEyedropper, setSavingEyedropper] = useState(false)

  // パレット
  const [palette, setPalette] = useState<string[]>([])
  const [selectedHexes, setSelectedHexes] = useState<Set<string>>(new Set())
  const [savingPalette, setSavingPalette] = useState(false)

  // imageLoaded が true になった後（canvasがDOMに現れた後）に描画する
  useEffect(() => {
    if (!imageLoaded) return
    const img = imgElementRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.drawImage(img, 0, 0)
  }, [imageLoaded])

  // 画像ファイルを読み込んでcanvasに描画 + colorthiefでパレット抽出
  const loadImageFile = (file: File) => {
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
    const url = URL.createObjectURL(file)
    setImageObjectUrl(url)
    setEyedropperHex(null)
    setPalette([])
    setSelectedHexes(new Set())

    const img = new Image()
    img.onload = () => {
      // imgを先にrefに保存してからstateを更新（useEffectで描画するため）
      imgElementRef.current = img
      setImageLoaded(true)

      // colorthief v3 でパレット抽出
      try {
        const raw = getPaletteSync(img, { colorCount: 5 })
        const hexes = raw?.map((c) => c.hex().toUpperCase()) ?? []
        setPalette(hexes)
        setSelectedHexes(new Set(hexes))
      } catch {
        // 抽出失敗時はパレットを表示しない
      }
    }
    img.src = url
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadImageFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) loadImageFile(file)
  }

  // canvas クリック → スポイト
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width))
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
    const hex = (
      '#' +
      [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
    ).toUpperCase()
    setEyedropperHex(hex)
  }

  // スポイト色を保存して閉じる
  const handleSaveEyedropper = async () => {
    if (!eyedropperHex) return
    setSavingEyedropper(true)
    try {
      await addColor(eyedropperHex, 1.0, activeFolderId)
      onClose()
    } finally {
      setSavingEyedropper(false)
    }
  }

  // パレットのチェックボックストグル
  const toggleHex = (hex: string) => {
    setSelectedHexes((prev) => {
      const next = new Set(prev)
      if (next.has(hex)) next.delete(hex)
      else next.add(hex)
      return next
    })
  }

  // 選択したパレット色を一括保存して閉じる
  const handleSavePalette = async () => {
    if (selectedHexes.size === 0) return
    setSavingPalette(true)
    try {
      for (const hex of selectedHexes) {
        await addColor(hex, 1.0, activeFolderId)
      }
      onClose()
    } finally {
      setSavingPalette(false)
    }
  }

  const handleReset = () => {
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
    setImageObjectUrl(null)
    setImageLoaded(false)
    imgElementRef.current = null
    setEyedropperHex(null)
    setPalette([])
    setSelectedHexes(new Set())
  }

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="glass-popup rounded-2xl p-6 w-[420px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-medium text-text-primary mb-4">画像から色を取得</h2>

        {!imageLoaded ? (
          /* --- アップロードゾーン --- */
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-accent transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-text-secondary text-sm mb-1">
              画像をドロップ、またはクリックして選択
            </p>
            <p className="text-text-muted text-xs">PNG / JPG / WebP 対応</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <>
            {/* --- キャンバス（スポイト用） --- */}
            <p className="text-xs text-text-secondary mb-2">
              画像をクリックして1色取得
            </p>
            <div
              className="rounded-xl overflow-hidden border border-border mb-3"
              style={{ maxHeight: '220px' }}
            >
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full cursor-crosshair"
                style={{ maxHeight: '220px', display: 'block' }}
              />
            </div>

            {/* スポイト結果 */}
            {eyedropperHex && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-surface-overlay rounded-xl">
                <ColorSwatch hex={eyedropperHex} size="sm" />
                <span className="text-sm font-mono text-text-primary flex-1">
                  {eyedropperHex}
                </span>
                <button
                  type="button"
                  onClick={handleSaveEyedropper}
                  disabled={savingEyedropper}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
                >
                  {savingEyedropper ? '追加中...' : 'この色を追加'}
                </button>
              </div>
            )}

            {/* --- パレット抽出結果 --- */}
            {palette.length > 0 ? (
              <>
                <p className="text-xs text-text-secondary mb-2">
                  抽出パレット（{selectedHexes.size}/{palette.length} 色を選択中）
                </p>
                <div className="space-y-1 mb-4">
                  {palette.map((hex, index) => (
                    <label
                      key={`${hex}-${index}`}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-overlay cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedHexes.has(hex)}
                        onChange={() => toggleHex(hex)}
                        className="sr-only"
                      />
                      <div
                        className={[
                          'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          selectedHexes.has(hex)
                            ? 'border-accent bg-accent'
                            : 'border-border',
                        ].join(' ')}
                      >
                        {selectedHexes.has(hex) && (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path
                              d="M1 3L3 5L7 1"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <ColorSwatch hex={hex} size="sm" />
                      <span className="text-xs font-mono text-text-primary">{hex}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleSavePalette}
                  disabled={selectedHexes.size === 0 || savingPalette}
                  className="w-full py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-2"
                >
                  {savingPalette
                    ? '追加中...'
                    : `選択した ${selectedHexes.size} 色を追加`}
                </button>
              </>
            ) : null}

            {/* 画像変更 / キャンセル */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary border border-border hover:bg-surface-overlay transition-colors"
              >
                画像を変更
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary border border-border hover:bg-surface-overlay transition-colors"
              >
                キャンセル
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
