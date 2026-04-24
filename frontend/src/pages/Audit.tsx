import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Search, Download, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/PageHeader'
import { adminService } from '@/services/vault.service'
import { fDateTime } from '@/utils/format'
import { cn } from '@/utils/cn'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'vault:read':       { label: 'Leitura',        color: 'text-brand bg-brand/10' },
  'vault:create':     { label: 'Criação',         color: 'text-blue-400 bg-blue-400/10' },
  'vault:update':     { label: 'Atualização',     color: 'text-yellow-400 bg-yellow-400/10' },
  'vault:delete':     { label: 'Exclusão',        color: 'text-danger bg-danger/10' },
  'vault:export':     { label: 'Exportação',      color: 'text-purple-400 bg-purple-400/10' },
  'vault:import':     { label: 'Importação',      color: 'text-orange-400 bg-orange-400/10' },
  'auth:login':       { label: 'Login',           color: 'text-success bg-success/10' },
  'auth:logout':      { label: 'Logout',          color: 'text-slate-400 bg-slate-400/10' },
  'auth:failed_login':{ label: 'Login falhou',    color: 'text-danger bg-danger/10' },
  'users:create':     { label: 'Usuário criado',  color: 'text-blue-400 bg-blue-400/10' },
  'users:delete':     { label: 'Usuário removido',color: 'text-danger bg-danger/10' },
}

export function Audit() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { search, action, page }],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 25 }
      if (search) params.search = search
      if (action) params.action = action
      return adminService.getAuditLogs(params)
    },
  })

  const logs = data?.logs ?? []
  const meta = data?.meta ?? { total: 0, pages: 1 }

  const handleExport = () => {
    const csv = ['Timestamp,Ação,Usuário,IP,Recurso',
      ...logs.map((l: any) => `"${fDateTime(l.createdAt)}","${l.action}","${l.userEmail || ''}","${l.ipAddress || ''}","${l.resourceId || ''}"`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `audit-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Log de Auditoria"
        description={`${meta.total} eventos registrados`}
        actions={
          <button onClick={handleExport} className="btn-ghost flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por email, IP..." className="input-field pl-10 w-full" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted pointer-events-none" />
          <select value={action} onChange={e => { setAction(e.target.value); setPage(1) }}
            className="input-field pl-9 pr-8 appearance-none min-w-[180px]">
            <option value="">Todas as ações</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide">Ação</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden md:table-cell">IP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden lg:table-cell">Recurso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 shimmer-bg rounded w-full" /></td></tr>
                ))
                : logs.length === 0
                ? <tr><td colSpan={5} className="px-4 py-16 text-center text-txt-muted text-sm">Nenhum evento encontrado</td></tr>
                : logs.map((log: any, i: number) => {
                  const act = ACTION_LABELS[log.action] || { label: log.action, color: 'text-txt-muted bg-bg-elevated' }
                  return (
                    <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-txt-secondary whitespace-nowrap">{fDateTime(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('badge border border-transparent text-xs', act.color)}>{act.label}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-txt-primary truncate max-w-[180px]">{log.userEmail || <span className="text-txt-muted">Sistema</span>}</td>
                      <td className="px-4 py-3 text-xs font-mono text-txt-muted hidden md:table-cell">{log.ipAddress || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-txt-muted hidden lg:table-cell truncate max-w-[160px]">{log.resourceId || '—'}</td>
                    </motion.tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      {meta.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-40">← Anterior</button>
          <span className="text-sm text-txt-muted">{page} / {meta.pages}</span>
          <button disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-40">Próxima →</button>
        </div>
      )}
    </div>
  )
}
