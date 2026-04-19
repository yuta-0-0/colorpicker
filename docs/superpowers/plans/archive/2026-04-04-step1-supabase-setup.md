# Step 1: Supabase・Google認証・RLS・DB設計・招待コードテーブル Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ElectronベースのColorPickerアプリの土台を構築する。Supabase接続・Google OAuth・全テーブルのDB設計・RLS・招待コードテーブルまでを完成させる。

**Architecture:** Electron + React + TypeScript + Vite をフロントエンドに、Supabase をバックエンドに採用。DB migrationはSQLファイルで管理。TypeScriptの型はDB設計から手動定義する。

**Tech Stack:** Electron 31, React 18, TypeScript 5, Vite 5, Tailwind CSS 3, Supabase JS v2, @supabase/auth-helpers-react

---

## ファイル構成（作成・変更するファイルの全量）

```
colorpicker/
├── electron/
│   ├── main.ts              # Electronメインプロセス
│   └── preload.ts           # contextBridge用プリロード
├── src/
│   ├── main.tsx             # Reactエントリポイント
│   ├── App.tsx              # ルートコンポーネント（認証ガード）
│   ├── lib/
│   │   └── supabase.ts      # Supabaseクライアント初期化
│   └── types/
│       └── database.ts      # DB全テーブルのTypeScript型定義
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # 全テーブル+RLS+インデックス
├── docs/superpowers/plans/  # このファイル
├── public/
│   └── icon.png             # アプリアイコン（仮）
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── electron-builder.config.js
├── .env.example
└── .gitignore
```

---

### Task 1: package.json と依存関係のセットアップ

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: package.json を作成する**

```json
{
  "name": "colorpicker",
  "version": "0.1.0-beta",
  "private": true,
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "dev:vite": "vite",
    "dev:electron": "electron .",
    "build": "tsc && vite build && electron-builder",
    "build:vite": "vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.43.4",
    "@supabase/auth-helpers-react": "^0.5.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "concurrently": "^8.2.2",
    "electron": "^31.0.0",
    "electron-builder": "^24.13.3",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.3.1",
    "vite-plugin-electron": "^0.28.7",
    "vite-plugin-electron-renderer": "^0.14.5"
  }
}
```

- [ ] **Step 2: .gitignore を作成する**

```
node_modules/
dist/
dist-electron/
.env
.env.local
.DS_Store
*.log
release/
```

- [ ] **Step 3: 依存関係をインストールする**

```bash
cd /Users/yutashimizu/Projects/apps/colorpicker
npm install
```

期待される出力: `added NNN packages` のメッセージ（エラーなし）

- [ ] **Step 4: コミット**

```bash
git init
git add package.json .gitignore
git commit -m "chore: initialize project with dependencies"
```

---

### Task 2: TypeScript・Vite・Tailwind の設定ファイル

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `index.html`

- [ ] **Step 1: tsconfig.json を作成する**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 2: tsconfig.node.json を作成する**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "tailwind.config.ts", "electron"]
}
```

- [ ] **Step 3: vite.config.ts を作成する**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: tailwind.config.ts を作成する**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ダークモード専用カラーパレット
        surface: {
          DEFAULT: '#1a1a1a',
          raised: '#222222',
          overlay: '#2a2a2a',
        },
        border: {
          DEFAULT: '#333333',
          subtle: '#2a2a2a',
        },
        text: {
          primary: '#f0f0f0',
          secondary: '#888888',
          muted: '#555555',
        },
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
        danger: '#ef4444',
        warning: '#f59e0b',
        success: '#22c55e',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: postcss.config.js を作成する**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: index.html を作成する**

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ColorPicker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: TypeScript型チェックが通ることを確認する**

```bash
npm run type-check
```

期待される出力: エラーなし（警告も出ないこと）

- [ ] **Step 8: コミット**

```bash
git add tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.ts postcss.config.js index.html
git commit -m "chore: add TypeScript, Vite, Tailwind config"
```

---

### Task 3: Electron メインプロセスとプリロード

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron-builder.config.js`

- [ ] **Step 1: electron/main.ts を作成する**

```typescript
import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import path from 'path'

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  const win = createWindow()

  // グローバルショートカット：⌘+Shift+P でアプリを前面に
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})

// スクリーンピッカー用のIPCハンドラ（Step 5で実装）
ipcMain.handle('screen-picker:start', async () => {
  // TODO: Step 5で実装
  return null
})
```

- [ ] **Step 2: electron/preload.ts を作成する**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  startScreenPicker: () => ipcRenderer.invoke('screen-picker:start'),
  platform: process.platform,
})
```

- [ ] **Step 3: electron-builder.config.js を作成する**

```js
/** @type {import('electron-builder').Configuration} */
export default {
  appId: 'com.colorpicker.app',
  productName: 'ColorPicker',
  directories: {
    output: 'release',
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
  ],
  mac: {
    target: {
      target: 'dmg',
      arch: ['arm64', 'x64'],
    },
    icon: 'public/icon.png',
    category: 'public.app-category.graphics-design',
  },
  dmg: {
    title: 'ColorPicker',
  },
}
```

- [ ] **Step 4: コミット**

```bash
git add electron/ electron-builder.config.js
git commit -m "feat: add Electron main process and preload"
```

---

### Task 4: React エントリポイント + Supabase クライアント

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/lib/supabase.ts`
- Create: `.env.example`

- [ ] **Step 1: .env.example を作成する**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 2: .env.local を作成する（Supabaseプロジェクト作成後に値を入力）**

```
VITE_SUPABASE_URL=（Supabaseダッシュボード > Settings > API > Project URL）
VITE_SUPABASE_ANON_KEY=（Supabaseダッシュボード > Settings > API > anon public key）
```

このファイルは `.gitignore` に含まれているため、コミットされない。

- [ ] **Step 3: src/lib/supabase.ts を作成する**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
```

- [ ] **Step 4: src/main.tsx を作成する**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 5: src/index.css を作成する（Tailwindディレクティブ）**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }

  body {
    @apply bg-surface text-text-primary font-sans;
    margin: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* スクロールバーをダークテーマに合わせる */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    @apply bg-surface;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-border rounded-full;
  }
}
```

- [ ] **Step 6: src/App.tsx を作成する（認証確認の最小実装）**

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-text-primary">
        <p className="text-sm text-text-secondary">Logged in as: {session.user.email}</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-4 px-4 py-2 bg-surface-overlay border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    if (!inviteCode.trim()) {
      setError('招待コードを入力してください')
      return
    }

    setLoading(true)
    setError('')

    // 招待コードの検証
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('id, used_by')
      .eq('code', inviteCode.trim())
      .single()

    if (inviteError || !invitation) {
      setError('招待コードが無効です')
      setLoading(false)
      return
    }

    if (invitation.used_by) {
      setError('この招待コードはすでに使用されています')
      setLoading(false)
      return
    }

    // Google OAuth でログイン
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          // 招待コードをstateとして渡す（ログイン後に使用する）
          state: inviteCode.trim(),
        },
      },
    })

    if (authError) {
      setError('ログインに失敗しました。もう一度お試しください。')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-surface">
      <div className="w-full max-w-sm p-8 bg-surface-raised border border-border rounded-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent rounded-xl mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-text-primary">ColorPicker</h1>
          <p className="text-sm text-text-secondary mt-1">Beta版 · 招待制</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">招待コード</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="招待コードを入力"
              className="w-full px-3 py-2 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full px-4 py-2.5 bg-white text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>処理中...</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google でログイン
              </>
            )}
          </button>

          <p className="text-xs text-text-muted text-center">
            本アプリはBeta版です。再配布は禁止されています。
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: コミット**

```bash
git add src/ .env.example
git commit -m "feat: add React entry, Supabase client, and login screen"
```

---

### Task 5: TypeScript 型定義（DB全テーブル）

**Files:**
- Create: `src/types/database.ts`

- [ ] **Step 1: src/types/database.ts を作成する**

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CmykSource = 'manual' | 'converted' | 'print_spec'

export interface Database {
  public: {
    Tables: {
      colors: {
        Row: {
          id: string
          user_id: string
          folder_id: string | null
          hex: string
          alpha: number
          c: number | null
          m: number | null
          y: number | null
          k: number | null
          cmyk_source: CmykSource | null
          name: string
          spot_color: string | null
          memo: string | null
          is_locked: boolean
          is_favorite: boolean
          is_archived: boolean
          order: number
          used_count: number
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          folder_id?: string | null
          hex: string
          alpha?: number
          c?: number | null
          m?: number | null
          y?: number | null
          k?: number | null
          cmyk_source?: CmykSource | null
          name: string
          spot_color?: string | null
          memo?: string | null
          is_locked?: boolean
          is_favorite?: boolean
          is_archived?: boolean
          order?: number
          used_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          folder_id?: string | null
          hex?: string
          alpha?: number
          c?: number | null
          m?: number | null
          y?: number | null
          k?: number | null
          cmyk_source?: CmykSource | null
          name?: string
          spot_color?: string | null
          memo?: string | null
          is_locked?: boolean
          is_favorite?: boolean
          is_archived?: boolean
          order?: number
          used_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          user_id: string
          name: string
          is_locked: boolean
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          is_locked?: boolean
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          is_locked?: boolean
          order?: number
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
        }
      }
      color_tags: {
        Row: {
          color_id: string
          tag_id: string
        }
        Insert: {
          color_id: string
          tag_id: string
        }
        Update: {
          color_id?: string
          tag_id?: string
        }
      }
      invitations: {
        Row: {
          id: string
          code: string
          used_by: string | null
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          used_by?: string | null
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          used_by?: string | null
          used_at?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      cmyk_source: CmykSource
    }
  }
}

// 便利な型エイリアス
export type Color = Database['public']['Tables']['colors']['Row']
export type ColorInsert = Database['public']['Tables']['colors']['Insert']
export type ColorUpdate = Database['public']['Tables']['colors']['Update']
export type Folder = Database['public']['Tables']['folders']['Row']
export type FolderInsert = Database['public']['Tables']['folders']['Insert']
export type Tag = Database['public']['Tables']['tags']['Row']
export type ColorTag = Database['public']['Tables']['color_tags']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']
```

- [ ] **Step 2: 型チェックを通す**

```bash
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/types/database.ts
git commit -m "feat: add TypeScript type definitions for all DB tables"
```

---

### Task 6: Supabase DBマイグレーション SQL

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: supabase/migrations/001_initial_schema.sql を作成する**

```sql
-- ============================================================
-- ColorPicker - Initial Schema
-- ============================================================

-- ENUM: CMYKの入力元
CREATE TYPE cmyk_source AS ENUM ('manual', 'converted', 'print_spec');

-- ============================================================
-- テーブル: folders
-- ============================================================
CREATE TABLE folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_locked   BOOLEAN NOT NULL DEFAULT FALSE,
  "order"     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- テーブル: colors
-- ============================================================
CREATE TABLE colors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id    UUID REFERENCES folders(id) ON DELETE SET NULL,
  hex          TEXT NOT NULL,
  alpha        FLOAT NOT NULL DEFAULT 1.0 CHECK (alpha >= 0.0 AND alpha <= 1.0),
  c            FLOAT CHECK (c IS NULL OR (c >= 0 AND c <= 100)),
  m            FLOAT CHECK (m IS NULL OR (m >= 0 AND m <= 100)),
  y            FLOAT CHECK (y IS NULL OR (y >= 0 AND y <= 100)),
  k            FLOAT CHECK (k IS NULL OR (k >= 0 AND k <= 100)),
  cmyk_source  cmyk_source,
  name         TEXT NOT NULL DEFAULT '',
  spot_color   TEXT,
  memo         TEXT,
  is_locked    BOOLEAN NOT NULL DEFAULT FALSE,
  is_favorite  BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
  "order"      INTEGER NOT NULL DEFAULT 0,
  used_count   INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- HEXフォーマット検証：#RRGGBB
  CONSTRAINT hex_format CHECK (hex ~ '^#[0-9A-Fa-f]{6}$')
);

-- ============================================================
-- テーブル: tags
-- ============================================================
CREATE TABLE tags (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  UNIQUE (user_id, name)
);

-- ============================================================
-- テーブル: color_tags（中間テーブル）
-- ============================================================
CREATE TABLE color_tags (
  color_id UUID NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (color_id, tag_id)
);

-- ============================================================
-- テーブル: invitations（クローズドベータ管理）
-- ============================================================
CREATE TABLE invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT NOT NULL UNIQUE,
  used_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER colors_updated_at
  BEFORE UPDATE ON colors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- インデックス
-- ============================================================
CREATE INDEX idx_colors_user_id     ON colors(user_id);
CREATE INDEX idx_colors_folder_id   ON colors(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX idx_colors_hex         ON colors(user_id, hex);
CREATE INDEX idx_colors_updated_at  ON colors(user_id, updated_at DESC);
CREATE INDEX idx_colors_is_favorite ON colors(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_colors_is_archived ON colors(user_id, is_archived);
CREATE INDEX idx_folders_user_id    ON folders(user_id);
CREATE INDEX idx_tags_user_id       ON tags(user_id);
CREATE INDEX idx_color_tags_tag_id  ON color_tags(tag_id);

-- ============================================================
-- RLS（Row Level Security）の有効化
-- ============================================================
ALTER TABLE colors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLSポリシー: colors
-- ============================================================
CREATE POLICY "colors: ユーザーは自分の色のみ操作可" ON colors
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RLSポリシー: folders
-- ============================================================
CREATE POLICY "folders: ユーザーは自分のフォルダのみ操作可" ON folders
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RLSポリシー: tags
-- ============================================================
CREATE POLICY "tags: ユーザーは自分のタグのみ操作可" ON tags
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RLSポリシー: color_tags
-- ============================================================
CREATE POLICY "color_tags: 自分の色に対するタグのみ操作可" ON color_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM colors
      WHERE colors.id = color_tags.color_id
        AND colors.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM colors
      WHERE colors.id = color_tags.color_id
        AND colors.user_id = auth.uid()
    )
  );

-- ============================================================
-- RLSポリシー: invitations
-- ============================================================
-- 未使用コードは誰でも読める（ログイン前の招待コード検証のため）
CREATE POLICY "invitations: 未使用コードは誰でも読める" ON invitations
  FOR SELECT
  USING (used_by IS NULL);

-- 使用済みコードは本人のみ読める
CREATE POLICY "invitations: 使用済みコードは本人のみ" ON invitations
  FOR SELECT
  USING (used_by = auth.uid());

-- 更新（招待コードの使用登録）はログイン済みユーザーのみ
CREATE POLICY "invitations: 使用登録はログイン済みのみ" ON invitations
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (used_by = auth.uid());

-- ============================================================
-- 保存数上限チェック関数（500色/ユーザー）
-- ============================================================
CREATE OR REPLACE FUNCTION check_color_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM colors WHERE user_id = NEW.user_id
  ) >= 500 THEN
    RAISE EXCEPTION 'COLOR_LIMIT_EXCEEDED: 保存できる色の上限（500色）に達しています';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_color_limit
  BEFORE INSERT ON colors
  FOR EACH ROW
  EXECUTE FUNCTION check_color_limit();
```

- [ ] **Step 2: コミット**

```bash
git add supabase/
git commit -m "feat: add initial DB schema with RLS and indexes"
```

---

### Task 7: Supabase プロジェクトのセットアップ（手動作業）

これはブラウザ上での手動作業です。

- [ ] **Step 1: Supabase プロジェクトを作成する**

1. https://supabase.com にアクセスしてログイン
2. 「New Project」をクリック
3. 以下を入力：
   - **Name:** `colorpicker`
   - **Database Password:** 安全なパスワードを設定（保存しておく）
   - **Region:** `Northeast Asia (Tokyo)` を選択
4. 「Create new project」をクリック（2〜3分待つ）

- [ ] **Step 2: DBマイグレーションを実行する**

1. Supabase Dashboard > SQL Editor を開く
2. `supabase/migrations/001_initial_schema.sql` の内容を全コピー
3. SQL Editor に貼り付けて「Run」をクリック
4. 「Success. No rows returned」が表示されることを確認

**検証クエリ（SQLエディタで実行して確認）：**

```sql
-- テーブルが全部作成されているか確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- 期待値: color_tags, colors, folders, invitations, tags の5テーブルが表示される

-- RLSが有効か確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- 全テーブルで rowsecurity = true であること

-- インデックスが作成されているか確認
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;
```

- [ ] **Step 3: Google OAuth を設定する**

1. Supabase Dashboard > Authentication > Providers > Google を開く
2. 「Enable Google provider」を ON にする
3. **Google Cloud Console での作業：**
   - https://console.cloud.google.com にアクセス
   - 新規プロジェクト「colorpicker」を作成
   - APIs & Services > OAuth consent screen を設定：
     - User Type: External
     - App name: ColorPicker
     - User support email: 自分のメール
   - APIs & Services > Credentials > Create Credentials > OAuth client ID を作成：
     - Application type: Web application
     - Authorized redirect URIs: `https://[your-project-ref].supabase.co/auth/v1/callback`
     - （project-refはSupabaseダッシュボードのURLから確認）
   - Client ID と Client Secret をコピー
4. SupabaseのGoogle Providerの設定に Client ID と Client Secret を貼り付けて保存

- [ ] **Step 4: Authorized Site URLを設定する**

1. Supabase Dashboard > Authentication > URL Configuration を開く
2. Site URL: `http://localhost:5173` を設定（開発用）
3. Additional Redirect URLs: `http://localhost:5173` を追加

- [ ] **Step 5: テスト招待コードを発行する**

```sql
-- SQLエディタで実行
INSERT INTO invitations (code) VALUES
  ('BETA-TEST-001'),
  ('BETA-TEST-002'),
  ('BETA-TEST-003');

-- 確認
SELECT * FROM invitations;
```

- [ ] **Step 6: API キーを .env.local に設定する**

1. Supabase Dashboard > Settings > API を開く
2. 「Project URL」をコピーして `.env.local` の `VITE_SUPABASE_URL=` に貼り付ける
3. 「anon public」キーをコピーして `.env.local` の `VITE_SUPABASE_ANON_KEY=` に貼り付ける

---

### Task 8: 動作確認

**Files:** 変更なし（動作確認のみ）

- [ ] **Step 1: 開発サーバーを起動する**

```bash
npm run dev:vite
```

期待される出力: `Local: http://localhost:5173/` が表示される

- [ ] **Step 2: ブラウザで動作確認する**

1. http://localhost:5173 を開く
2. ログイン画面が表示されること
3. 招待コード `BETA-TEST-001` を入力して「Google でログイン」をクリック
4. Googleのログイン画面にリダイレクトされること
5. ログイン後、`Logged in as: your@email.com` が表示されること
6. 「Sign Out」ボタンでログアウトできること

- [ ] **Step 3: 型チェックが全体で通ることを最終確認する**

```bash
npm run type-check
```

期待される出力: エラーなし

- [ ] **Step 4: 最終コミット**

```bash
git add .env.example
git commit -m "chore: add env.example for Supabase credentials"
```

---

## セルフレビュー

**仕様カバレッジ確認：**
- [x] Supabase 接続設定
- [x] Google OAuth（Supabase Auth）
- [x] colors・folders・tags・color_tags・invitations テーブル
- [x] 全テーブルに RLS（`user_id = auth.uid()`）
- [x] 必要なインデックス（user_id / folder_id / tag_id / hex / updated_at / is_favorite / is_archived）
- [x] 招待コードテーブル（invitations）
- [x] updated_at 自動更新トリガー
- [x] 保存数上限チェック（500色）
- [x] HEXフォーマットバリデーション（`#RRGGBB`）
- [x] cmyk_source の ENUM 型
- [x] TypeScript 型定義（全テーブル）
- [x] `.env.example` による環境変数テンプレート

**除外した項目（color_history は Step 11でIndexedDBとして実装）：**
- color_history テーブル → Supabase不使用・IndexedDB実装（Step 11）
- オフライン対応 → Service Worker + IndexedDB（Step 12）
- Electron統合テスト → Vite開発サーバーで先に動作確認
