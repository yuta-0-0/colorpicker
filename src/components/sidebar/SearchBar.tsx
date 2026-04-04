import { useEffect, useRef } from 'react'
import { useUIStore } from '@/store/uiStore'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const searchFocusTrigger = useUIStore((s) => s.searchFocusTrigger)

  useEffect(() => {
    if (searchFocusTrigger > 0) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [searchFocusTrigger])

  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs">
        ⌘F
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="検索"
        className="w-full pl-9 pr-3 py-1.5 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:outline-dashed focus:outline-2 focus:outline-offset-1 focus:outline-accent/50 transition-colors"
      />
    </div>
  )
}
