import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ImageLightboxProps {
  src: string
  imageId: string
  isOpen: boolean
  onClose: () => void
}

export function ImageLightbox({ src, imageId, isOpen, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-50"
            style={{ backdropFilter: 'blur(16px)' }}
          />
          <motion.img
            layoutId={`mood-image-${imageId}`}
            src={src}
            alt="Mood image"
            className="fixed inset-0 m-auto max-w-2xl max-h-[80vh] rounded-xl object-contain z-50 shadow-2xl"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={onClose}
          />
        </>
      )}
    </AnimatePresence>
  )
}
