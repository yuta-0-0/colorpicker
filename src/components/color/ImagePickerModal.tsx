interface ImagePickerModalProps {
  onClose: () => void
}

export function ImagePickerModal({ onClose }: ImagePickerModalProps) {
  return (
    <div onClick={onClose}>ImagePickerModal stub</div>
  )
}
