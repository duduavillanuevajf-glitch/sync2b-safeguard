import { useState, useCallback } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { generatePassword, type PasswordOptions } from '@/utils/password'
import { PasswordField } from './PasswordField'
import { cn } from '@/utils/cn'

interface Props {
  onSelect: (password: string) => void
}

export function PasswordGenerator({ onSelect }: Props) {
  const [opts, setOpts] = useState<PasswordOptions>({
    length: 24,
    uppercase: true,
    lowercase: true,
    digits: true,
    symbols: true,
  })
  const [generated, setGenerated] = useState(() => generatePassword({
    length: 24, uppercase: true, lowercase: true, digits: true, symbols: true,
  }))

  const refresh = useCallback(() => setGenerated(generatePassword(opts)), [opts])

  const toggle = (key: keyof Omit<PasswordOptions, 'length'>) => {
    const next = { ...opts, [key]: !opts[key] }
    const hasAny = next.uppercase || next.lowercase || next.digits || next.symbols
    if (!hasAny) return
    setOpts(next)
    setGenerated(generatePassword(next))
  }

  const setLength = (v: number) => {
    const next = { ...opts, length: v }
    setOpts(next)
    setGenerated(generatePassword(next))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4 rounded-2xl bg-bg-elevated border border-border"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-txt-primary">
        <Sparkles className="w-4 h-4 text-brand" />
        Gerador de senha
      </div>

      <PasswordField value={generated} readOnly showStrength />

      {/* Length slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-txt-muted">
          <span>Comprimento</span>
          <span className="font-mono font-bold text-brand">{opts.length}</span>
        </div>
        <input
          type="range" min={8} max={64} value={opts.length}
          onChange={e => setLength(Number(e.target.value))}
          className="w-full h-1.5 bg-bg-panel rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-brand"
        />
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { key: 'uppercase', label: 'A–Z' },
          { key: 'lowercase', label: 'a–z' },
          { key: 'digits',    label: '0–9' },
          { key: 'symbols',   label: '!@#' },
        ] as { key: keyof Omit<PasswordOptions, 'length'>; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={cn(
              'flex items-center justify-center gap-2 h-9 rounded-xl text-xs font-semibold border transition-all duration-200',
              opts[key]
                ? 'bg-brand/10 text-brand border-brand/25'
                : 'bg-bg-panel text-txt-muted border-border hover:border-border-strong'
            )}
          >
            <span className="font-mono">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-panel border border-border
                     text-txt-secondary hover:text-txt-primary hover:border-border-strong
                     text-xs font-medium transition-all duration-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Gerar nova
        </button>
        <button
          type="button"
          onClick={() => onSelect(generated)}
          className="flex-1 btn-primary text-sm"
        >
          Usar esta senha
        </button>
      </div>
    </motion.div>
  )
}
