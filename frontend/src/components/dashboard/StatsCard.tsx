import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Props {
  icon: LucideIcon
  label: string
  value: string | number
  delta?: string
  deltaPositive?: boolean
  color?: 'brand' | 'warn' | 'danger' | 'info'
  loading?: boolean
  delay?: number
}

const colorMap = {
  brand: { icon: 'text-brand', bg: 'bg-brand/10', border: 'border-brand/20', glow: 'shadow-brand' },
  warn:  { icon: 'text-warn',  bg: 'bg-warn/10',  border: 'border-warn/20',  glow: '' },
  danger:{ icon: 'text-danger',bg: 'bg-danger/10', border: 'border-danger/20', glow: '' },
  info:  { icon: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', glow: '' },
}

export function StatsCard({ icon: Icon, label, value, delta, deltaPositive, color = 'brand', loading, delay = 0 }: Props) {
  const c = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.4,0,0.2,1] }}
      className="glass rounded-2xl p-5 border border-border hover:border-border-strong transition-all duration-300 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', c.bg, c.border)}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
        {delta && (
          <span className={cn(
            'text-xs font-semibold px-2 py-1 rounded-lg',
            deltaPositive ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
          )}>
            {deltaPositive ? '↑' : '↓'} {delta}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 shimmer-bg rounded-lg" />
          <div className="h-4 w-32 shimmer-bg rounded-md" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-txt-primary tracking-tight">
            {value}
          </p>
          <p className="text-sm text-txt-secondary mt-0.5">{label}</p>
        </>
      )}
    </motion.div>
  )
}
