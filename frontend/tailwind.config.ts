import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0a',
        'bg-surface': '#141414',
        'bg-elevated': '#1e1e1e',
        'accent': '#6366f1',
        'accent-hover': '#4f46e5',
        'text-primary': '#f5f5f5',
        'text-secondary': '#a3a3a3',
        'border': '#2a2a2a',
        'success': '#22c55e',
        'error': '#ef4444',
        'warning': '#f59e0b',
      },
      fontFamily: {
        syne: ['var(--font-syne)', 'sans-serif'],
        'dm-sans': ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
