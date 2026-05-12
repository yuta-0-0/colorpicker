/**
 * colorStore.ts
 *
 * @deprecated PHASE 4 — colorStore は memoryStore に統合されました。
 *
 * このファイルは後方互換性のための再エクスポートのみです。
 * 新規コードは useMemoryStore を直接 import してください。
 *
 * import { useMemoryStore } from '@/stores/memoryStore'
 *
 * 注意：
 *   addColor は廃止されました。
 *   保存は saveColor(hex, { alpha, folderId, name, memo }) を使用してください。
 */

export { useMemoryStore as useColorStore } from '@/stores/memoryStore'
