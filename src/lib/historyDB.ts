import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'colorpicker-history'
const STORE_NAME = 'color_history'
const MAX_ITEMS = 50

export interface HistoryColor {
  id: string
  hex: string
  alpha: number
  created_at: string
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

/**
 * 履歴に色を追加する。
 * - 同一 HEX は上書き（重複作成しない）
 * - MAX_ITEMS を超えた場合は古いものを削除（FIFO）
 */
export async function addToHistory(hex: string, alpha = 1.0): Promise<void> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME) as HistoryColor[]

  // 同一 HEX を除外
  const filtered = all.filter((c) => c.hex.toUpperCase() !== hex.toUpperCase())

  const newItem: HistoryColor = {
    id: crypto.randomUUID(),
    hex: hex.toUpperCase(),
    alpha,
    created_at: new Date().toISOString(),
  }

  // 新しいものを先頭に、MAX_ITEMS 件に絞る
  const updated = [newItem, ...filtered].slice(0, MAX_ITEMS)

  const tx = db.transaction(STORE_NAME, 'readwrite')
  await tx.store.clear()
  for (const item of updated) {
    await tx.store.add(item)
  }
  await tx.done
}

/**
 * 履歴を取得する（新しい順）
 */
export async function getHistory(): Promise<HistoryColor[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME) as HistoryColor[]
  return all.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

/**
 * 履歴を全件削除する
 */
export async function clearHistory(): Promise<void> {
  const db = await getDB()
  await db.clear(STORE_NAME)
}
