// src/types/floating.ts

export type SnapSide = 'none' | 'left' | 'right'
export type FloatingState = 'tab' | 'toolbar' | 'dock'

export interface FSColorData {
  hex: string
  alpha: number
  name: string
}

export interface FSHistoryItem {
  hex: string
  alpha: number
}

export interface FSFolderData {
  id: string
  name: string
  icon: string | null
  colors: FSColorData[]
}

export interface FSSyncPayload {
  currentColor: FSColorData
  previousColor: FSColorData | null
  history: FSHistoryItem[]
  folders: FSFolderData[]
}
