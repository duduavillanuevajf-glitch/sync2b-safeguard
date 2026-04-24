import { cn } from '@/utils/cn'
import { SERVICE_COLORS, ROLE_CONFIG } from '@/utils/format'
import type { Role, ServiceType } from '@/types'

export function ServiceBadge({ service }: { service?: string | null }) {
  const s = service || 'Outro'
  const c = SERVICE_COLORS[s] || SERVICE_COLORS['Outro']
  return (
    <span className={cn('badge border font-mono text-[11px] tracking-wide', c.bg, c.text, c.border)}>
      {s}
    </span>
  )
}

export function RoleBadge({ role }: { role: Role }) {
  const c = ROLE_CONFIG[role] || ROLE_CONFIG['vault_viewer']
  return (
    <span className={cn('badge border', c.bg, c.text, c.border)}>
      {c.label}
    </span>
  )
}

export function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="badge bg-success/10 text-success border border-success/20">
      <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
      Ativo
    </span>
  ) : (
    <span className="badge bg-slate-500/10 text-slate-400 border border-slate-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
      Inativo
    </span>
  )
}

export function AlertBadge({ days }: { days: number }) {
  const color = days > 180 ? 'danger' : days > 90 ? 'warn' : 'warn'
  return (
    <span className={cn(
      'badge border',
      color === 'danger' ? 'bg-danger/10 text-danger border-danger/20' : 'bg-warn/10 text-warn border-warn/20'
    )}>
      ⚠ {days}d sem atualização
    </span>
  )
}
