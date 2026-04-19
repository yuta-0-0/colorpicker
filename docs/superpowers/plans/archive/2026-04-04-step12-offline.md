> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

# Step 12: オフライン対応（Service Worker + IndexedDB）

## 目標

ネットワーク切断時にトースト通知を表示し、復帰時に自動同期する。vite-plugin-pwa で Service Worker を生成し、アセットをキャッシュしてオフラインでも UI を表示できる状態にする。

## 注意事項

Electron アプリでは Service Worker は動作しないため、このステップの Service Worker 部分は PWA（iPhone）向けが主目的。トースト通知とオフライン検知は Electron/Web 両対応。

---

## 新規パッケージ

```bash
npm install -D vite-plugin-pwa
```

`workbox-window` は `vite-plugin-pwa` のピア依存として自動インストールされる。

---

## アーキテクチャ

```
src/
  store/
    toastStore.ts            — トースト通知の Zustand 管理（新規）
  components/ui/
    Toast.tsx                — トースト 1件表示コンポーネント（新規）
    ToastContainer.tsx       — トースト一覧を画面右下に表示（新規）
  hooks/
    useNetworkStatus.ts      — navigator.onLine + online/offline イベント監視（新規）

vite.config.ts               — PWA プラグイン設定追加（既存ファイル変更）
public/
  manifest.json              — Step 13 の準備（新規、Step 13 で完成）
```

---

## タスク一覧

### Task 1: src/store/toastStore.ts を作成する

**作成ファイル:** `src/store/toastStore.ts`

```typescript
import { create } from 'zustand'

export type ToastType = 'info' | 'success' | 'error'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void
}

const TOAST_DURATION_MS = 3500

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (message, type = 'info') => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, TOAST_DURATION_MS)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 2: src/components/ui/Toast.tsx と ToastContainer.tsx を作成する

**作成ファイル:** `src/components/ui/Toast.tsx`

```typescript
import type { Toast } from '@/store/toastStore'
import { useToastStore } from '@/store/toastStore'

interface ToastProps {
  toast: Toast
}

const TYPE_STYLES: Record<Toast['type'], string> = {
  info: 'bg-surface border-border text-text-primary',
  success: 'bg-green-900/80 border-green-700 text-green-100',
  error: 'bg-red-900/80 border-red-700 text-red-100',
}

const TYPE_ICONS: Record<Toast['type'], string> = {
  info: 'ℹ',
  success: '✓',
  error: '✗',
}

export function ToastItem({ toast }: ToastProps) {
  const { removeToast } = useToastStore()

  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm text-sm',
        'animate-in slide-in-from-bottom-2 duration-200',
        TYPE_STYLES[toast.type],
      ].join(' ')}
    >
      <span className="flex-shrink-0 text-base">{TYPE_ICONS[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity text-xs"
      >
        ✕
      </button>
    </div>
  )
}
```

**作成ファイル:** `src/components/ui/ToastContainer.tsx`

```typescript
import { useToastStore } from '@/store/toastStore'
import { ToastItem } from '@/components/ui/Toast'

export function ToastContainer() {
  const { toasts } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 3: src/hooks/useNetworkStatus.ts を作成し、AppLayout に組み込む

**作成ファイル:** `src/hooks/useNetworkStatus.ts`

```typescript
import { useEffect, useState } from 'react'

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
```

**変更ファイル:** `src/components/layout/AppLayout.tsx`（または相当するルートコンポーネント）

```typescript
import { useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useToastStore } from '@/store/toastStore'
import { ToastContainer } from '@/components/ui/ToastContainer'

// コンポーネント内
const isOnline = useNetworkStatus()
const { addToast } = useToastStore()
const prevIsOnline = useRef(true)

useEffect(() => {
  if (prevIsOnline.current && !isOnline) {
    addToast('オフラインです。復帰時に自動で同期されます。', 'error')
  } else if (!prevIsOnline.current && isOnline) {
    addToast('オンラインに復帰しました。', 'success')
    // TODO: Step 12 完成後に同期処理を呼び出す
  }
  prevIsOnline.current = isOnline
}, [isOnline, addToast])

// JSX の最後に追加
<ToastContainer />
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 4: colorStore / folderStore のネットワークエラー時に addToast を呼び出す

**変更ファイル:** `src/store/colorStore.ts`, `src/store/folderStore.ts`

方針：
- Supabase への保存が失敗した場合（error が存在する場合）に `useToastStore.getState().addToast()` を呼び出す
- Zustand ストア外から別ストアの状態を変更するには `getState()` を使う

例（colorStore.ts の addColor 内）：
```typescript
import { useToastStore } from '@/store/toastStore'

// エラー時
if (error) {
  const message = (error.message as string).includes('COLOR_LIMIT_EXCEEDED')
    ? '保存できる色の上限（500色）に達しています'
    : 'ネットワークエラー。オンライン復帰時に再試行してください。'
  set({ error: message })
  useToastStore.getState().addToast(message, 'error')
  return null
}
```

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 5: vite-plugin-pwa をインストールし、vite.config.ts に設定を追加する

**パッケージインストール:**
```bash
npm install -D vite-plugin-pwa
```

**変更ファイル:** `vite.config.ts`

```typescript
import { VitePWA } from 'vite-plugin-pwa'

// plugins 配列に追加
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 1日
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
  manifest: false, // Step 13 で public/manifest.json を手動管理するため false
  devOptions: {
    enabled: false, // 開発時は Service Worker を無効化（Electron と競合するため）
  },
}),
```

**注意:** Electron ビルドでは Service Worker は動作しないが、vite-plugin-pwa 自体の追加はビルドに影響しない。`devOptions.enabled: false` で開発時は無効化しておく。

**型チェック:**
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npm run type-check
```

---

### Task 6: public/manifest.json のスケルトンを作成する（Step 13 で完成させる）

**作成ファイル:** `public/manifest.json`

```json
{
  "name": "ColorPicker",
  "short_name": "ColorPicker",
  "description": "グラフィックデザイナー向けカラー管理アプリ",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#1a1a1a",
  "orientation": "portrait",
  "icons": []
}
```

アイコンは Step 13 で追加する。

**コミット:**
```bash
git add src/store/toastStore.ts src/components/ui/Toast.tsx src/components/ui/ToastContainer.tsx src/hooks/useNetworkStatus.ts src/store/colorStore.ts src/store/folderStore.ts vite.config.ts public/manifest.json
git commit -m "$(cat <<'EOF'
feat: add toast notifications, offline detection, and PWA Service Worker foundation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
