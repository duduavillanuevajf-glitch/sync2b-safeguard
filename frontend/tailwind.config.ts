import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:      'var(--color-bg-base)',
          primary:   'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          elevated:  'var(--color-bg-elevated)',
          panel:     'var(--color-bg-panel)',
        },
        brand: {
          DEFAULT: '#00C47D',
          dim:     '#00a368',
          glow:    'rgba(0,196,125,0.25)',
          muted:   'rgba(0,196,125,0.12)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong:  'var(--color-border-strong)',
          accent:  'rgba(0,196,125,0.35)',
        },
        txt: {
          primary:   'var(--color-txt-primary)',
          secondary: 'var(--color-txt-secondary)',
          muted:     'var(--color-txt-muted)',
          accent:    '#00C47D',
        },
        danger:  { DEFAULT: '#ef4444', muted: 'rgba(239,68,68,0.12)' },
        warn:    { DEFAULT: '#f59e0b', muted: 'rgba(245,158,11,0.12)' },
        info:    { DEFAULT: '#3b82f6', muted: 'rgba(59,130,246,0.12)' },
        success: { DEFAULT: '#22c55e', muted: 'rgba(34,197,94,0.12)' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        card:           '0 4px 24px rgba(0,0,0,0.5)',
        'card-lg':      '0 8px 48px rgba(0,0,0,0.7)',
        brand:          '0 0 24px rgba(0,196,125,0.2)',
        'brand-lg':     '0 0 48px rgba(0,196,125,0.35)',
        glow:           '0 0 60px rgba(0,196,125,0.15)',
        'inset-brand':  'inset 0 0 24px rgba(0,196,125,0.08)',
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg,#00C47D,#00a3ff)',
        'danger-gradient': 'linear-gradient(135deg,#ef4444,#f97316)',
        'warn-gradient':   'linear-gradient(135deg,#f59e0b,#eab308)',
        'info-gradient':   'linear-gradient(135deg,#3b82f6,#8b5cf6)',
        'mesh-bg':         'radial-gradient(ellipse 80% 50% at 50% -20%,rgba(0,196,125,0.07),transparent)',
        'card-gradient':   'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))',
      },
      keyframes: {
        'fade-in':    { from:{opacity:'0',transform:'translateY(8px)'}, to:{opacity:'1',transform:'translateY(0)'} },
        'fade-up':    { from:{opacity:'0',transform:'translateY(20px)'}, to:{opacity:'1',transform:'translateY(0)'} },
        'pulse-ring': { '0%,100%':{opacity:'0.6',transform:'scale(1)'}, '50%':{opacity:'1',transform:'scale(1.04)'} },
        'shimmer':    { from:{backgroundPosition:'-200% 0'}, to:{backgroundPosition:'200% 0'} },
        'glow-pulse': { '0%,100%':{boxShadow:'0 0 20px rgba(0,196,125,0.2)'}, '50%':{boxShadow:'0 0 40px rgba(0,196,125,0.4)'} },
      },
      animation: {
        'fade-in':    'fade-in 0.4s ease-out both',
        'fade-up':    'fade-up 0.5s ease-out both',
        'pulse-ring': 'pulse-ring 2.5s ease-in-out infinite',
        'shimmer':    'shimmer 2s linear infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
