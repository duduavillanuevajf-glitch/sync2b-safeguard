import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type ThemeMode } from '@/hooks/useTheme'
import { cn } from '@/utils/cn'

const OPTIONS = [
  { value: 'light'  as ThemeMode, Icon: Sun,     label: 'Claro'   },
  { value: 'dark'   as ThemeMode, Icon: Moon,    label: 'Escuro'  },
  { value: 'system' as ThemeMode, Icon: Monitor, label: 'Sistema' },
]

export function ThemeToggle() {
  const { mode, setMode } = useTheme()

  return (
    <div
      role="group"
      aria-label="Tema"
      className="flex items-center gap-0.5 p-1 rounded-xl bg-bg-secondary border border-border"
    >
      {OPTIONS.map(({ value, Icon, label }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          title={label}
          aria-pressed={mode === value}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
            mode === value
              ? 'bg-brand text-white shadow-sm shadow-brand/30'
              : 'text-txt-muted hover:text-txt-primary hover:bg-black/5 dark:hover:bg-white/5'
          )}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
