interface FolderListProps {
  activeFolderId: string | null
  onSelectFolder: (id: string) => void
}

export function FolderList({ activeFolderId, onSelectFolder }: FolderListProps) {
  const MOCK_FOLDERS = [
    { id: 'f1', name: 'ブランドカラー', count: 8 },
    { id: 'f2', name: 'Webプロジェクト', count: 12 },
    { id: 'f3', name: '印刷素材', count: 5 },
  ]

  return (
    <div className="space-y-0.5">
      {MOCK_FOLDERS.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onSelectFolder(folder.id)}
          type="button"
          className={[
            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left',
            activeFolderId === folder.id
              ? 'bg-surface-overlay text-text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay/50',
          ].join(' ')}
        >
          <span className="text-xs">📁</span>
          <span className="flex-1 truncate">{folder.name}</span>
          <span className="text-xs text-text-muted">{folder.count}</span>
        </button>
      ))}
      <button
        type="button"
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-secondary transition-colors text-left"
      >
        <span className="text-xs">＋</span>
        <span>フォルダを追加</span>
      </button>
    </div>
  )
}
