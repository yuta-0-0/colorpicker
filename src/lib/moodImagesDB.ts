import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'colorpicker-mood'
const STORE_NAME = 'mood_images'
const MAX_IMAGES_PER_COLOR = 3

export interface MoodImage {
  id: string
  colorId: string
  blob: Blob
  /** Object URL（表示用・揮発性。再生成して使う） */
  created_at: string
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('by_color', 'colorId')
      }
    },
  })
}

export async function addMoodImage(colorId: string, file: File): Promise<MoodImage | null> {
  const db = await getDB()
  const existing = await db.getAllFromIndex(STORE_NAME, 'by_color', colorId) as MoodImage[]
  if (existing.length >= MAX_IMAGES_PER_COLOR) return null

  const newItem: MoodImage = {
    id: crypto.randomUUID(),
    colorId,
    blob: file,
    created_at: new Date().toISOString(),
  }
  await db.add(STORE_NAME, newItem)
  return newItem
}

export async function getMoodImages(colorId: string): Promise<MoodImage[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex(STORE_NAME, 'by_color', colorId) as MoodImage[]
  return all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export async function deleteMoodImage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}
