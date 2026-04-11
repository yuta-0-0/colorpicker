import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ImageLightbox } from '@/components/color/ImageLightbox'
import {
  addMoodImage,
  getMoodImages,
  deleteMoodImage,
  type MoodImage,
} from '@/lib/moodImagesDB'

const MAX_SLOTS = 3

interface SlotWithUrl {
  image: MoodImage
  url: string
}

interface MoodImageSlotsProps {
  colorId: string
}

export function MoodImageSlots({ colorId }: MoodImageSlotsProps) {
  const [slots, setSlots] = useState<SlotWithUrl[]>([])
  const [lightboxTarget, setLightboxTarget] = useState<SlotWithUrl | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const images = await getMoodImages(colorId)
    // 既存の Object URL を revoke
    setSlots((prev) => {
      prev.forEach((s) => URL.revokeObjectURL(s.url))
      return images.map((img) => ({ image: img, url: URL.createObjectURL(img.blob) }))
    })
  }

  useEffect(() => {
    load()
    return () => {
      setSlots((prev) => {
        prev.forEach((s) => URL.revokeObjectURL(s.url))
        return []
      })
    }
  }, [colorId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const result = await addMoodImage(colorId, file)
    if (result) await load()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteMoodImage(id)
    await load()
  }

  const emptyCount = MAX_SLOTS - slots.length

  return (
    <>
      <div className="flex gap-2">
        {/* 既存画像サムネイル */}
        {slots.map((slot, i) => (
          <motion.div
            key={slot.image.id}
            layoutId={`mood-image-${slot.image.id}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{
              delay: i * 0.05,
              type: 'spring',
              stiffness: 400,
              damping: 25,
            }}
            className="relative group/img w-16 h-16 rounded overflow-hidden border border-border/50 cursor-pointer flex-shrink-0"
            onClick={() => setLightboxTarget(slot)}
          >
            <img
              src={slot.url}
              alt="Mood"
              className="w-full h-full object-cover"
            />
            {/* 削除ボタン */}
            <button
              type="button"
              onClick={(e) => handleDelete(e, slot.image.id)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[9px] flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity leading-none"
              title="削除"
            >
              ✕
            </button>
          </motion.div>
        ))}

        {/* 空スロット */}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <button
            key={`empty-${i}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded border border-dashed border-border/50 flex items-center justify-center text-text-muted/40 text-xl hover:border-accent/50 hover:text-accent/50 transition-colors flex-shrink-0"
            title="画像を追加"
          >
            +
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {lightboxTarget && (
        <ImageLightbox
          src={lightboxTarget.url}
          imageId={lightboxTarget.image.id}
          isOpen={true}
          onClose={() => setLightboxTarget(null)}
        />
      )}
    </>
  )
}
