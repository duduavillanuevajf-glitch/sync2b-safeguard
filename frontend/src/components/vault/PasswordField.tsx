import { useState } from 'react'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'
import { copyToClipboard } from '@/utils/format'
import { checkStrength } from '@/utils/password'

interface Props {
  value: string
  showStrength?: boolean
  className?: string
  readOnly?: boolean
  onChange?: (v: string) => void
  placeholder?: string
}

export function PasswordField({ value, showStrength, className, readOnly, onChange, placeholder }: Props) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const strength = showStrength ? checkStrength(value) : null

  const handleCopy = async () => {
    await copyToClipboard(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative flex items-center">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          readOnly={readOnly}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder || 'Senha'}
          className={cn(
            'input-field font-mono pr-20',
            readOnly && 'cursor-default select-all',
          )}
        />
        <div className="absolute right-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all"
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-brand hover:bg-brand/5 transition-all"
            >
              <AnimatePresence mode="wait">
                {copied
                  ? <motion.div key="check" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><Check className="w-4 h-4 text-brand" /></motion.div>
                  : <motion.div key="copy" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><Copy className="w-4 h-4" /></motion.div>
                }
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>

      {showStrength && value && strength && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-txt-muted">Força da senha</span>
            <span style={{ color: strength.color }} className="font-semibold">{strength.label}</span>
          </div>
          <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${strength.percent}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="h-full rounded-full transition-colors"
              style={{ backgroundColor: strength.color }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
