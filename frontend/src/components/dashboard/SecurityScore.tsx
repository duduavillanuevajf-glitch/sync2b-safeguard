import { motion } from 'framer-motion'
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Props {
  score: number
  staleCount: number
  weakCount: number
  totalItems: number
}

function getGrade(score: number) {
  if (score >= 90) return { label: 'Excelente', icon: ShieldCheck, color: '#00C47D' }
  if (score >= 70) return { label: 'Bom',       icon: Shield,      color: '#3B82F6' }
  if (score >= 50) return { label: 'Regular',   icon: ShieldAlert, color: '#F59E0B' }
  return            { label: 'Crítico',         icon: ShieldAlert, color: '#EF4444' }
}

const RADIUS = 52
const CIRC = 2 * Math.PI * RADIUS

export function SecurityScore({ score, staleCount, weakCount, totalItems }: Props) {
  const grade = getGrade(score)
  const GradeIcon = grade.icon
  const dash = (score / 100) * CIRC

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.4,0,0.2,1] }}
      className="glass rounded-2xl p-6 border border-border"
    >
      <div className="flex items-center gap-2 mb-6">
        <GradeIcon className="w-5 h-5" style={{ color: grade.color }} />
        <span className="text-sm font-semibold text-txt-primary">Score de Segurança</span>
      </div>

      <div className="flex items-center gap-8">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <svg width="130" height="130" className="-rotate-90">
            <circle cx="65" cy="65" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <motion.circle
              cx="65" cy="65" r={RADIUS}
              fill="none"
              stroke={grade.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: CIRC - dash }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              style={{ filter: `drop-shadow(0 0 8px ${grade.color}60)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-txt-primary">{score}</span>
            <span className="text-xs text-txt-muted font-medium">/100</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-xs text-txt-secondary">Total de itens</span>
            <span className="text-sm font-bold text-txt-primary">{totalItems}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-xs text-txt-secondary">Credenciais obsoletas</span>
            <span className={cn('text-sm font-bold', staleCount > 0 ? 'text-warn' : 'text-success')}>{staleCount}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs text-txt-secondary">Senhas fracas</span>
            <span className={cn('text-sm font-bold', weakCount > 0 ? 'text-danger' : 'text-success')}>{weakCount}</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-lg font-bold" style={{ color: grade.color }}>{grade.label}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
