import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark' as ThemeMode,
      setMode: (mode) => set({ mode }),
    }),
    { name: 'safeguard-theme' }
  )
)

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark)
  root.classList.toggle('dark', isDark)
  root.classList.toggle('light', !isDark)
}

export function useTheme() {
  const { mode, setMode } = useThemeStore()

  useEffect(() => {
    applyTheme(mode)

    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  return { mode, setMode }
}

export function initTheme() {
  try {
    const raw = localStorage.getItem('safeguard-theme')
    if (raw) {
      const { state } = JSON.parse(raw) as { state: ThemeState }
      if (state?.mode) { applyTheme(state.mode); return }
    }
  } catch {}
  applyTheme('dark')
}
