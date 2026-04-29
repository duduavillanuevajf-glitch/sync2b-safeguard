import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Plus, Search, Download, LayoutGrid, List, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from '@/components/ui/PageHeader'
import { VaultTable } from '@/components/vault/VaultTable'
import { CredentialCard } from '@/components/vault/CredentialCard'
import { CredentialModal } from '@/components/vault/CredentialModal'
import { vaultService } from '@/services/vault.service'
import type { VaultItem } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/cn'

const SERVICE_TYPES = ['', 'SIP','SSH','MySQL','PostgreSQL','SFTP','RDP','HTTPS','API','Email','Outro']

type SavePayload = Partial<VaultItem> & { password?: string }

export function Vault() {
  const { hasPermission } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [service, setService] = useState('')
  const [category, setCategory] = useState('')
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VaultItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<VaultItem | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['vault', { search, service, category, page }],
    queryFn: () => {
      const params: Record<string, string | number | boolean> = { page }
      if (search)   params.search   = search
      if (service)  params.service  = service
      if (category) params.category = category
      return vaultService.list(params)
    },
  })

  const createMut = useMutation({
    mutationFn: (d: SavePayload) => vaultService.create(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vault'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: SavePayload }) => vaultService.update(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vault'] }),
  })

  const toggleMut = useMutation({
    mutationFn: (id: string) => vaultService.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vault'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => vaultService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault'] }); setConfirmDelete(null) },
  })

  const items: VaultItem[] = data?.items ?? []
  const meta = data?.meta ?? { total: 0, pages: 1 }

  const handleSave = async (formData: SavePayload) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, d: formData })
    } else {
      await createMut.mutateAsync(formData)
    }
  }

  const handleExport = async () => {
    const blob = await vaultService.exportCsv()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `vault-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const openEdit = (item: VaultItem) => { setEditing(item); setModalOpen(true) }
  const openNew  = () => { setEditing(null); setModalOpen(true) }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={KeyRound}
        title="Cofre de Credenciais"
        description={`${meta.total} credenciais no cofre`}
        actions={
          <div className="flex items-center gap-2">
            {hasPermission('vault:export') && (
              <button onClick={handleExport} className="btn-ghost flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" />
                Exportar
              </button>
            )}
            {hasPermission('vault:create') && (
              <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Nova credencial
              </button>
            )}
          </div>
        }
      />

      {/* Category tabs */}
      <div className="flex items-center gap-1 p-1 glass rounded-2xl border border-border self-start">
        {[
          { value: '',              label: 'Todas' },
          { value: 'pessoal',      label: 'Pessoal' },
          { value: 'compartilhada',label: 'Compartilhada' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setCategory(tab.value); setPage(1) }}
            className={cn(
              'px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200',
              category === tab.value
                ? 'bg-brand text-white shadow-sm'
                : 'text-txt-muted hover:text-txt-primary hover:bg-white/[0.04]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por título, usuário, host..."
            className="input-field pl-10 w-full"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted pointer-events-none" />
          <select
            value={service}
            onChange={e => { setService(e.target.value); setPage(1) }}
            className="input-field pl-9 pr-8 appearance-none min-w-[140px]"
          >
            <option value="">Todos serviços</option>
            {SERVICE_TYPES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 p-1 glass rounded-xl border border-border">
          <button onClick={() => setView('table')} className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all', view === 'table' ? 'bg-brand/15 text-brand' : 'text-txt-muted hover:text-txt-primary')}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setView('grid')} className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all', view === 'grid' ? 'bg-brand/15 text-brand' : 'text-txt-muted hover:text-txt-primary')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === 'table' ? (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <VaultTable
              items={items}
              loading={isLoading}
              onView={openEdit}
              onEdit={openEdit}
              onDelete={setConfirmDelete}
              onToggle={item => toggleMut.mutate(item.id)}
              canEdit={hasPermission('vault:update')}
              canDelete={hasPermission('vault:delete')}
            />
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-48 shimmer-bg rounded-2xl" />)
              : items.map((item, i) => (
                <CredentialCard
                  key={item.id}
                  item={item}
                  delay={i * 0.04}
                  onView={() => openEdit(item)}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setConfirmDelete(item)}
                  canEdit={hasPermission('vault:update')}
                  canDelete={hasPermission('vault:delete')}
                />
              ))
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-40">← Anterior</button>
          <span className="text-sm text-txt-muted">{page} / {meta.pages}</span>
          <button disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-40">Próxima →</button>
        </div>
      )}

      {/* Modal */}
      <CredentialModal
        open={modalOpen}
        item={editing}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={handleSave}
      />

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="relative glass-strong rounded-2xl border border-border p-6 max-w-sm w-full shadow-card-lg">
              <h3 className="text-lg font-bold text-txt-primary mb-2">Confirmar exclusão</h3>
              <p className="text-sm text-txt-secondary mb-6">
                Tem certeza que deseja excluir <span className="text-txt-primary font-semibold">{confirmDelete.title}</span>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancelar</button>
                <button onClick={() => deleteMut.mutate(confirmDelete.id)} className="btn-danger flex-1">
                  {deleteMut.isPending ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
