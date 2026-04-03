interface TagListProps {
  activeTagId: string | null
  onSelectTag: (id: string) => void
}

export function TagList({ activeTagId, onSelectTag }: TagListProps) {
  const MOCK_TAGS = [
    { id: 't1', name: 'ブランド' },
    { id: 't2', name: '印刷用' },
    { id: 't3', name: 'Web' },
  ]

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {MOCK_TAGS.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelectTag(tag.id)}
          type="button"
          className={[
            'px-2 py-0.5 rounded-full text-xs transition-colors',
            activeTagId === tag.id
              ? 'bg-accent text-white'
              : 'bg-surface-overlay text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
