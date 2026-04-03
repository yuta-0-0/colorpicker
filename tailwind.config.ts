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
