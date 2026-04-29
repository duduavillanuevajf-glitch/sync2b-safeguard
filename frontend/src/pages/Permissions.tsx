import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Check, X, Plus, Edit, Trash2, Copy, ChevronDown, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/Badge'
import { rolesService } from '@/services/roles.service'
import { cn } from '@/utils/cn'
import type { CustomRole, Role } from '@/types'

const ALL_PERMISSIONS = [
  { group: 'Credenciais', items: [
    { key: 'credential:read',   label: 'Visualizar credenciais' },
    { key: 'credential:create', label: 'Criar credenciais' },
    { key: 'credential:update', label: 'Editar credenciais' },
    { key: 'credential:delete', label: 'Excluir credenciais' },
    { key: 'credential:export', label: 'Exportar credenciais' },
    { key: 'credential:import', label: 'Importar credenciais' },
    { key: 'credential:toggle', label: 'Arquivar/reativar' },
  ]},
  { group: 'Usuários', items: [
    { key: 'users:read',   label: 'Visualizar usuários' },
    { key: 'users:create', label: 'Criar usuários' },
    { key: 'users:update', label: 'Editar usuários' },
    { key: 'users:delete', label: 'Remover usuários' },
  ]},
  { group: 'Equipes & Tags', items: [
    { key: 'tags:manage',  label: 'Gerenciar tags' },
    { key: 'roles:manage', label: 'Gerenciar perfis de acesso' },
  ]},
  { group: 'Administração', items: [
    { key: 'audit:read',      label: 'Acessar auditoria' },
    { key: 'org:manage',      label: 'Gerenciar organização' },
    { key: 'tenants:manage',  label: 'Gerenciar tenants (super admin)' },
  ]},
]

const BASE_ROLES: Record<Role, string[]> = {
  super_admin:   ['*'],
  org_admin:     ['credential:read','credential:create','credential:update','credential:delete','credential:export','credential:import','credential:toggle','users:read','users:create','users:update','users:delete','audit:read','org:manage','tags:manage','roles:manage'],
  vault_manager: ['credential:read','credential:create','credential:update','credential:delete','credential:export','credential:import','credential:toggle','audit:read','tags:manage'],
  vault_viewer:  ['credential:read'],
}

const BASE_ROLE_NAMES: Record<Role, string> = {
  super_admin:   'Super Admin',
  org_admin:     'Admin',
  vault_manager: 'Gestor',
  vault_viewer:  'Visualizador',
}

function hasPermission(perms: string[], key: string) {
  return perms.includes('*') || perms.includes(key)
}

const roleSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, 'Selecione ao menos uma permissão'),
})
type RoleForm = z.infer<typeof roleSchema>

function RoleModal({
  role, onClose, onSave
}: { role?: CustomRole | null; onClose: () => void; onSave: (d: RoleForm) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: role ? { name: role.name, description: role.description || '', permissions: role.permissions } : { permissions: [] },
  })

  const selectedPerms = watch('permissions') || []

  const togglePerm = (key: string) => {
    if (selectedPerms.includes(key)) setValue('permissions', selectedPerms.filter(p => p !== key))
    else setValue('permissions', [...selectedPerms, key])
  }

  const toggleGroup = (group: { items: { key: string }[] }) => {
    const keys = group.items.map(i => i.key)
    const allSelected = keys.every(k => selectedPerms.includes(k))
    if (allSelected) setValue('permissions', selectedPerms.filter(p => !keys.includes(p)))
    else setValue('permissions', [...new Set([...selectedPerms, ...keys])])
  }

  const onSubmit = async (data: RoleForm) => {
    setSaving(true)
    try { await onSave(data); onClose() } finally { setSaving(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative glass-strong rounded-3xl border border-border w-full max-w-lg p-6 shadow-card-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-txt-primary">{role ? 'Editar perfil' : 'Novo perfil de acesso'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Nome do perfil</label>
            <input {...register('name')} className="input-field" placeholder="ex: Suporte, NOC, Infra..." />
            {errors.name && <p className="text-danger text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Descrição (opcional)</label>
            <textarea {...register('description')} className="input-field resize-none h-16" placeholder="Descreva as responsabilidades deste perfil..." />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Permissões</label>
              <span className="text-xs text-txt-muted">{selectedPerms.length} selecionada(s)</span>
            </div>
            {errors.permissions && <p className="text-danger text-xs">{errors.permissions.message}</p>}

            <div className="space-y-2">
              {ALL_PERMISSIONS.map(group => {
                const isExpanded = expanded[group.group] !== false
                const keys = group.items.map(i => i.key)
                const selectedCount = keys.filter(k => selectedPerms.includes(k)).length

                return (
                  <div key={group.group} className="rounded-xl border border-border overflow-hidden">
                    <button type="button"
                      onClick={() => setExpanded(e => ({ ...e, [group.group]: !isExpanded }))}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-bg-elevated hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-txt-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-txt-muted" />}
                        <span className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">{group.group}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-txt-muted">{selectedCount}/{keys.length}</span>
                        <button type="button" onClick={e => { e.stopPropagation(); toggleGroup(group) }}
                          className="text-[10px] text-brand hover:underline">
                          {selectedCount === keys.length ? 'Remover todos' : 'Selecionar todos'}
                        </button>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-border">
                        {group.items.map(perm => (
                          <label key={perm.key} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] cursor-pointer">
                            <div className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0',
                              selectedPerms.includes(perm.key)
                                ? 'bg-brand border-brand'
                                : 'border-border hover:border-brand/50'
                            )}>
                              {selectedPerms.includes(perm.key) && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={selectedPerms.includes(perm.key)} onChange={() => togglePerm(perm.key)} />
                            <div>
                              <p className="text-sm text-txt-primary">{perm.label}</p>
                              <p className="text-[10px] text-txt-muted font-mono">{perm.key}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Salvando...' : role ? 'Atualizar perfil' : 'Criar perfil'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export function Permissions() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'system' | 'custom'>('system')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CustomRole | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CustomRole | null>(null)

  const { data: customRoles = [], isLoading } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: () => rolesService.list(),
  })

  const createMut = useMutation({
    mutationFn: (d: RoleForm) => rolesService.create(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-roles'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: RoleForm }) => rolesService.update(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-roles'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => rolesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-roles'] }); setConfirmDelete(null) },
  })

  const duplicateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => rolesService.duplicate(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-roles'] }),
  })

  const handleSave = async (d: RoleForm) => {
    if (editing) await updateMut.mutateAsync({ id: editing.id, d })
    else await createMut.mutateAsync(d)
  }

  const baseRoles = Object.entries(BASE_ROLE_NAMES) as [Role, string][]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="Perfis de Acesso"
        description="Controle de acesso baseado em funções (RBAC)"
        actions={
          tab === 'custom' ? (
            <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Novo perfil
            </button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl border border-border w-fit">
        <button onClick={() => setTab('system')}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'system' ? 'bg-brand/10 text-brand border border-brand/20' : 'text-txt-muted hover:text-txt-primary')}>
          Papéis do sistema
        </button>
        <button onClick={() => setTab('custom')}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'custom' ? 'bg-brand/10 text-brand border border-brand/20' : 'text-txt-muted hover:text-txt-primary')}>
          Perfis personalizados
          {customRoles.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] bg-brand/20 text-brand">{customRoles.length}</span>
          )}
        </button>
      </div>

      {tab === 'system' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide min-w-[200px]">Permissão</th>
                  {baseRoles.map(([role, name]) => (
                    <th key={role} className="px-4 py-4 text-center">
                      <RoleBadge role={role} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSIONS.map(group => (
                  <>
                    <tr key={group.group} className="bg-bg-elevated/50">
                      <td colSpan={baseRoles.length + 1} className="px-5 py-2 text-xs font-bold text-txt-muted uppercase tracking-wider">
                        {group.group}
                      </td>
                    </tr>
                    {group.items.map((perm, i) => (
                      <motion.tr key={perm.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="border-t border-border hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm text-txt-primary">{perm.label}</p>
                          <p className="text-xs text-txt-muted font-mono">{perm.key}</p>
                        </td>
                        {baseRoles.map(([role]) => (
                          <td key={role} className="px-4 py-3 text-center">
                            {hasPermission(BASE_ROLES[role] || [], perm.key) ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/15 border border-success/25">
                                <Check className="w-3.5 h-3.5 text-success" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-elevated border border-border">
                                <X className="w-3.5 h-3.5 text-txt-muted/40" />
                              </span>
                            )}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border bg-bg-elevated/30">
            <p className="text-xs text-txt-muted">Papéis do sistema são somente leitura. Crie perfis personalizados para permissões customizadas.</p>
          </div>
        </motion.div>
      )}

      {tab === 'custom' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 shimmer-bg rounded-2xl" />)}</div>
          ) : customRoles.length === 0 ? (
            <div className="glass rounded-2xl border border-border p-16 text-center">
              <Shield className="w-12 h-12 mx-auto mb-3 text-txt-muted opacity-40" />
              <p className="text-txt-muted text-sm mb-2">Nenhum perfil personalizado</p>
              <p className="text-txt-muted text-xs mb-4">Crie perfis como Suporte, NOC, Infra, Financeiro com permissões customizadas.</p>
              <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-primary text-sm">
                Criar primeiro perfil
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customRoles.map((role, i) => (
                <motion.div key={role.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={cn('glass rounded-2xl border p-5 flex flex-col gap-3 group transition-colors hover:border-brand/30',
                    role.isActive ? 'border-border' : 'border-border/40 opacity-60')}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-txt-primary">{role.name}</p>
                        {role.isSystem && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand/10 text-brand border border-brand/20">sistema</span>
                        )}
                      </div>
                      {role.description && <p className="text-xs text-txt-muted mt-0.5 line-clamp-2">{role.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => { setEditing(role); setModalOpen(true) }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => duplicateMut.mutate({ id: role.id, name: `Cópia de ${role.name}` })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-brand hover:bg-brand/10 transition-all">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {!role.isSystem && (
                        <button onClick={() => setConfirmDelete(role)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-danger hover:bg-danger/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 4).map(p => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-md bg-bg-elevated border border-border text-txt-muted font-mono">{p}</span>
                    ))}
                    {role.permissions.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-bg-elevated border border-border text-txt-muted">
                        +{role.permissions.length - 4} mais
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                      role.isActive ? 'text-success bg-success/10' : 'text-txt-muted bg-bg-elevated')}>
                      {role.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="text-xs text-txt-muted">{role.permissions.length} permissão(ões)</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <RoleModal
            role={editing}
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
              <h3 className="text-lg font-bold text-txt-primary mb-2">Excluir perfil</h3>
              <p className="text-sm text-txt-secondary mb-6">
                Excluir o perfil <span className="text-txt-primary font-semibold">{confirmDelete.name}</span>?
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
