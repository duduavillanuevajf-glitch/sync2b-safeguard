import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, Search, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { adminService } from '@/services/vault.service'
import { fDateTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'

const orgSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  slug: z.string().min(2, 'Mínimo 2 caracteres').regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  plan: z.string().optional(),
  maxUsers: z.coerce.number().min(1).optional(),
  maxVaultItems: z.coerce.number().min(1).optional(),
  alertDays: z.coerce.number().min(1).optional(),
})
type OrgForm = z.infer<typeof orgSchema>

function CreateOrgModal({ onClose, onSave }: { onClose: () => void; onSave: (d: OrgForm) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    defaultValues: { plan: 'basic', maxUsers: 10, maxVaultItems: 100, alertDays: 90 },
  })

  const onSubmit = async (data: OrgForm) => {
    setSaving(true)
    try { await onSave(data); onClose() } finally { setSaving(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative glass-strong rounded-3xl border border-border w-full max-w-lg p-6 shadow-card-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-txt-primary">Nova organização</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Nome</label>
              <input {...register('name')} className="input-field" placeholder="Acme Corp" />
              {errors.name && <p className="text-danger text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Slug</label>
              <input {...register('slug')} className="input-field" placeholder="acme-corp" />
              {errors.slug && <p className="text-danger text-xs">{errors.slug.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Plano</label>
            <select {...register('plan')} className="input-field appearance-none">
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Máx. usuários</label>
              <input {...register('maxUsers')} type="number" min={1} className="input-field" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Máx. credenciais</label>
              <input {...register('maxVaultItems')} type="number" min={1} className="input-field" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Dias alerta</label>
              <input {...register('alertDays')} type="number" min={1} className="input-field" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Criando...' : 'Criar organização'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export function Organizations() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const isSuperAdmin = user?.role === 'super_admin'

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => adminService.listOrganizations(),
  })

  const createMut = useMutation({
    mutationFn: (d: OrgForm) => adminService.createOrganization(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  })

  const toggleMut = useMutation({
    mutationFn: (id: string) => adminService.toggleOrganization(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  })

  const filtered = (orgs as any[]).filter(o =>
    search === '' ||
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.slug?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Organizações"
        description={`${orgs.length} organização(ões) no sistema`}
        actions={isSuperAdmin ? (
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Nova organização
          </button>
        ) : undefined}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar organização..." className="input-field pl-10 w-full" />
      </div>

      <div className="glass rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide">Organização</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden md:table-cell">Plano</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden lg:table-cell">Limites</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden lg:table-cell">Criada em</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide">Status</th>
              {isSuperAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 shimmer-bg rounded" /></td></tr>
              ))
              : filtered.length === 0
              ? <tr><td colSpan={6} className="px-4 py-16 text-center text-txt-muted text-sm">Nenhuma organização encontrada</td></tr>
              : filtered.map((org: any, i: number) => (
                <motion.tr key={org.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-brand" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-txt-primary">{org.name}</p>
                        <p className="text-xs text-txt-muted font-mono">{org.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs font-semibold uppercase px-2 py-1 rounded-lg bg-bg-elevated text-txt-secondary">
                      {org.plan || 'basic'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="text-xs text-txt-muted space-y-0.5">
                      <p>{org.max_users ?? '—'} usuários</p>
                      <p>{org.max_vault_items ?? '—'} credenciais</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-txt-muted hidden lg:table-cell">{fDateTime(org.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold px-2 py-1 rounded-lg',
                      org.is_active ? 'text-success bg-success/10' : 'text-danger bg-danger/10')}>
                      {org.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3">
                      <button onClick={() => toggleMut.mutate(org.id)}
                        className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors',
                          org.is_active ? 'text-txt-muted hover:text-danger' : 'text-txt-muted hover:text-success')}>
                        {org.is_active
                          ? <><ToggleRight className="w-4 h-4" /> Desativar</>
                          : <><ToggleLeft className="w-4 h-4" /> Ativar</>
                        }
                      </button>
                    </td>
                  )}
                </motion.tr>
              ))
            }
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <CreateOrgModal
            onClose={() => setModalOpen(false)}
            onSave={async (d) => { await createMut.mutateAsync(d) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
