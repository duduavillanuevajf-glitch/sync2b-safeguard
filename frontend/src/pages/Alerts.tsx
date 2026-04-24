import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldAlert, Clock, RefreshCw, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/PageHeader'
import { ServiceBadge } from '@/components/ui/Badge'
import { CredentialModal } from '@/components/vault/CredentialModal'
import { vaultService } from '@/services/vault.service'
import { fRelative } from '@/utils/format'
import type { VaultItem } from '@/types'
import { cn } from '@/utils/cn'

const THRESHOLDS = [
  { days: 30,  label: '30 dias',  color: 'text-danger',  bg: 'bg-danger/10',  border: 'border-danger/20' },
  { days: 60,  label: '60 dias',  color: 'text-warn',    bg: 'bg-warn/10',    border: 'border-warn/20' },
  { days: 90,  label: '90 dias',  color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  { days: 180, label: '180 dias', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
]

export function Alerts() {
  const qc = useQueryClient()
  const [threshold, setThreshold] = useState(90)
  const [editing, setEditing] = useState<VaultItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['vault-alerts', threshold],
    queryFn: () => vaultService.getAlerts(threshold),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<VaultItem> }) => vaultService.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault-alerts'] }); setModalOpen(false) },
  })

  const items: VaultItem[] = Array.isArray(alerts) ? alerts : []

  const critical = items.filter(i => (i.staleDays ?? 0) > 180)
  const warning  = items.filter(i => (i.staleDays ?? 0) > 90 && (i.staleDays ?? 0) <= 180)
  const info     = items.filter(i => (i.staleDays ?? 0) <= 90)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldAlert}
        title="Alertas de Rotação"
        description="Credenciais que precisam de atenção"
      />

      {/* Threshold selector */}
      <div className="flex flex-wrap gap-2">
        {THRESHOLDS.map(t => (
          <button
            key={t.days}
            onClick={() => setThreshold(t.days)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200',
              threshold === t.days
                ? cn(t.bg, t.color, t.border)
                : 'bg-bg-elevated border-border text-txt-muted hover:border-border-strong'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            &gt; {t.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass rounded-2xl border border-danger/20 p-4 text-center">
            <p className="text-3xl font-black text-danger mb-1">{critical.length}</p>
            <p className="text-xs text-txt-muted">Crítico (&gt;180d)</p>
          </div>
          <div className="glass rounded-2xl border border-warn/20 p-4 text-center">
            <p className="text-3xl font-black text-warn mb-1">{warning.length}</p>
            <p className="text-xs text-txt-muted">Atenção (&gt;90d)</p>
          </div>
          <div className="glass rounded-2xl border border-brand/20 p-4 text-center">
            <p className="text-3xl font-black text-brand mb-1">{items.length}</p>
            <p className="text-xs text-txt-muted">Total</p>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 shimmer-bg rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-success opacity-60" />
            <p className="text-txt-primary font-semibold">Tudo em ordem!</p>
            <p className="text-sm text-txt-muted">Nenhuma credencial ultrapassou o limite de {threshold} dias.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item, i) => {
              const days = item.staleDays ?? 0
              const colorClass = days > 180 ? 'text-danger' : days > 90 ? 'text-warn' : 'text-yellow-400'
              const bgClass    = days > 180 ? 'bg-danger/10' : days > 90 ? 'bg-warn/10' : 'bg-yellow-400/10'
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <ServiceBadge service={item.serviceType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-txt-primary truncate">{item.title}</p>
                    <p className="text-xs text-txt-muted font-mono">{item.username}</p>
                    {item.host && <p className="text-xs text-txt-muted">{item.host}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-black', bgClass, colorClass)}>
                      <Clock className="w-3.5 h-3.5" />
                      {days}d
                    </span>
                    <p className="text-xs text-txt-muted mt-1">{fRelative(item.updatedAt)}</p>
                  </div>
                  <button
                    onClick={() => { setEditing(item); setModalOpen(true) }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand/10 border border-brand/25 text-brand text-xs font-semibold hover:bg-brand/20 transition-all flex-shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Rotacionar
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <CredentialModal
        open={modalOpen}
        item={editing}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={async (data) => { if (editing) await updateMut.mutateAsync({ id: editing.id, d: data }) }}
      />
    </div>
  )
}
