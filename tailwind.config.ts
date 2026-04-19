import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          raised:   'rgb(var(--color-surface-raised) / <alpha-value>)',
          overlay:  'rgb(var(--color-surface-overlay) / <alpha-value>)',
          sidebar:  'rgb(var(--color-surface-sidebar) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          subtle:  'rgb(var(--color-border-subtle) / <alpha-value>)',
          sidebar: 'rgb(var(--color-border-sidebar) / <alpha-value>)',
        },
        text: {
          primary:   'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          muted:     'rgb(var(--color-text-muted) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover:   'rgb(var(--color-accent-hover) / <alpha-value>)',
          soft:    'rgb(var(--color-accent-soft) / <alpha-value>)',
          ring:    'rgb(var(--color-accent-ring) / <alpha-value>)',
        },
        // ブランドのシグネチャーブルー — ナビゲーション・アクティブ状態に専用（accent に追従）
        'signature-blue': 'rgb(var(--color-accent) / <alpha-value>)',
        danger:  '#ef4444',
        warning: '#f59e0b',
        success: '#22c55e',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      // ── モーショントークン ─────────────────────────────────────────────────
      // ease-spatial: Apple/Framer 準拠のスプリングライク Bezier
      // transition-[prop] duration-200 ease-spatial のように使う
      transitionTimingFunction: {
        'spatial': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
