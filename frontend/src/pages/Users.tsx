import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users as UsersIcon, Plus, Search, Mail, Shield, Trash2, Edit, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleBadge, StatusBadge } from '@/components/ui/Badge'
import { adminService } from '@/services/vault.service'
import { fDateTime } from '@/utils/format'
import type { User } from '@/types'
import { cn } from '@/utils/cn'

const ROLES = ['org_admin', 'vault_manager', 'vault_viewer'] as const

const createSchema = z.object({
  firstName: z.string().min(1, 'Obrigatório'),
  lastName:  z.string().min(1, 'Obrigatório'),
  email:     z.string().email('Email inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  role:      z.enum(ROLES),
})

const editSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  role:      z.enum(ROLES),
  isActive:  z.boolean(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm   = z.infer<typeof editSchema>

function UserModal({ user, onClose, onSave }: { user?: User | null; onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [saving, setSaving] = useState(false)

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { role: 'vault_viewer' } })
  const editForm   = useForm<EditForm>({ resolver: zodResolver(editSchema), defaultValues: user ? { firstName: user.firstName || '', lastName: user.lastName || '', role: user.role as any, isActive: user.isActive } : undefined })

  const onSubmit = async (data: any) => {
    setSaving(true)
    try { await onSave(data); onClose() } finally { setSaving(false) }
  }

  const form = user ? editForm : createForm
  const handleSubmit = user ? editForm.handleSubmit(onSubmit) : createForm.handleSubmit(onSubmit)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative glass-strong rounded-3xl border border-border w-full max-w-md p-6 shadow-card-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-txt-primary">{user ? 'Editar usuário' : 'Novo usuário'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Nome</label>
              <input {...(user ? (editForm.register as any) : createForm.register)('firstName')} className="input-field" placeholder="João" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Sobrenome</label>
              <input {...(user ? (editForm.register as any) : createForm.register)('lastName')} className="input-field" placeholder="Silva" />
            </div>
          </div>

          {!user && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Email</label>
                <input {...createForm.register('email')} type="email" className="input-field" placeholder="joao@empresa.com" />
                {createForm.formState.errors.email && <p className="text-danger text-xs">{createForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Senha temporária</label>
                <input {...createForm.register('password')} type="password" className="input-field" placeholder="••••••••" />
                {createForm.formState.errors.password && <p className="text-danger text-xs">{createForm.formState.errors.password.message}</p>}
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Função</label>
            <select {...(user ? (editForm.register as any) : createForm.register)('role')} className="input-field appearance-none">
              <option value="vault_viewer">Visualizador</option>
              <option value="vault_manager">Gerenciador</option>
              <option value="org_admin">Administrador</option>
            </select>
          </div>

          {user && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated border border-border">
              <span className="text-sm text-txt-secondary">Conta ativa</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...editForm.register('isActive')} className="sr-only peer" />
                <div className="w-10 h-5 bg-bg-panel rounded-full peer peer-checked:bg-brand transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Salvando...' : user ? 'Atualizar' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export function Users() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => {
      const params: Record<string, string | number> = {}
      if (search) params.search = search
      return adminService.listUsers(params)
    },
  })

  const createMut = useMutation({
    mutationFn: (d: any) => adminService.createUser(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => adminService.updateUser(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setConfirmDelete(null) },
  })

  const users: User[] = data?.users ?? []

  const handleSave = async (d: any) => {
    if (editing) { await updateMut.mutateAsync({ id: editing.id, d }) }
    else         { await createMut.mutateAsync(d) }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UsersIcon}
        title="Usuários"
        description={`${data?.meta?.total ?? 0} usuários na organização`}
        actions={
          <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Novo usuário
          </button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou email..." className="input-field pl-10 w-full" />
      </div>

      <div className="glass rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide">Usuário</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide">Função</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden md:table-cell">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden lg:table-cell">Criado em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-8 shimmer-bg rounded" /></td></tr>
              ))
              : users.length === 0
              ? <tr><td colSpan={5} className="px-4 py-16 text-center text-txt-muted text-sm">Nenhum usuário encontrado</td></tr>
              : users.map((user, i) => (
                <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand/15 border border-brand/25 flex items-center justify-center text-xs font-bold text-brand flex-shrink-0">
                        {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-txt-primary">{[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}</p>
                        <p className="text-xs text-txt-muted flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><StatusBadge active={user.isActive} /></td>
                  <td className="px-4 py-3 text-xs text-txt-muted hidden lg:table-cell">{fDateTime(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditing(user); setModalOpen(true) }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(user)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-danger hover:bg-danger/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            }
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <UserModal
            user={editing}
            onClose={() => { setModalOpen(false); setEditing(null) }}
            onSave={handleSave}
          />
        )}
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="relative glass-strong rounded-2xl border border-border p-6 max-w-sm w-full shadow-card-lg">
              <h3 className="text-lg font-bold text-txt-primary mb-2">Remover usuário</h3>
              <p className="text-sm text-txt-secondary mb-6">
                Remover <span className="text-txt-primary font-semibold">{confirmDelete.email}</span>? Esta ação revogará todos os acessos imediatamente.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancelar</button>
                <button onClick={() => deleteMut.mutate(confirmDelete.id)} className="btn-danger flex-1">
                  {deleteMut.isPending ? 'Removendo...' : 'Remover'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
