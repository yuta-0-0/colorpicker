import { useEffect, useRef } from 'react'
import { useUIStore } from '@/store/uiStore'

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { searchQuery, setSearchQuery, searchFocusTrigger } = useUIStore()

  useEffect(() => {
    if (searchFocusTrigger > 0) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [searchFocusTrigger])

  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs pointer-events-none">
        ⌘F
      </span>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="検索"
        className="w-full pl-9 pr-7 py-1.5 bg-white/5 border border-white/8 rounded-md text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-transparent transition-[box-shadow,border-color] duration-150"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => {
            setSearchQuery('')
            inputRef.current?.focus()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors text-xs leading-none"
          aria-label="検索をクリア"
        >
          ✕
        </button>
      )}
    </div>
  )
}
