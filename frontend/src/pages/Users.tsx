import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users as UsersIcon, Plus, Search, Mail, Trash2, Edit, X, QrCode, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react'
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
  firstName:  z.string().min(1, 'Obrigatório'),
  lastName:   z.string().min(1, 'Obrigatório'),
  email:      z.string().email('Email inválido'),
  password:   z.string().min(8, 'Mínimo 8 caracteres'),
  role:       z.enum(ROLES),
  require2fa: z.boolean(),
})

const editSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  role:      z.enum(ROLES),
  isActive:  z.boolean(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm   = z.infer<typeof editSchema>

// ── QR Code Modal ─────────────────────────────────────────────────────────────

function QrModal({ qrCode, otpSecret, onClose }: { qrCode: string; otpSecret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const copySecret = () => {
    navigator.clipboard.writeText(otpSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        className="relative glass-strong rounded-3xl border border-brand/30 w-full max-w-sm p-6 shadow-card-lg text-center">
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center gap-2 mb-4">
          <QrCode className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-bold text-txt-primary">Configuração 2FA</h2>
        </div>

        <p className="text-sm text-txt-secondary mb-5">
          Escaneie o QR Code no <span className="font-semibold text-txt-primary">Google Authenticator</span>, Microsoft Authenticator ou Authy.
        </p>

        <div className="flex justify-center mb-5">
          <div className="p-3 bg-white rounded-2xl shadow-lg">
            <img src={qrCode} alt="QR Code 2FA" className="w-44 h-44" />
          </div>
        </div>

        <p className="text-xs text-txt-muted mb-2">Ou insira a chave manualmente:</p>
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-bg-elevated border border-border mb-5">
          <code className="flex-1 text-xs font-mono text-txt-primary break-all text-left">{otpSecret}</code>
          <button onClick={copySecret}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-brand hover:bg-brand/10 transition-all shrink-0">
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="p-3 rounded-xl bg-warn/5 border border-warn/20 text-xs text-warn/90 text-left mb-5">
          Guarde esta chave em local seguro. Ela não poderá ser exibida novamente.
        </div>

        <button onClick={onClose} className="btn-primary w-full">Concluído</button>
      </motion.div>
    </motion.div>
  )
}

// ── User Modal ────────────────────────────────────────────────────────────────

function UserModal({
  user, onClose, onSave, onReset2FA, onDisable2FA,
}: {
  user?: User | null
  onClose: () => void
  onSave: (d: any) => Promise<void>
  onReset2FA?: () => Promise<void>
  onDisable2FA?: () => Promise<void>
}) {
  const [saving, setSaving]           = useState(false)
  const [resetting2fa, setResetting2fa] = useState(false)
  const [disabling2fa, setDisabling2fa] = useState(false)

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'vault_viewer', require2fa: true },
  })
  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: user
      ? { firstName: user.firstName || '', lastName: user.lastName || '', role: user.role as any, isActive: user.isActive }
      : undefined,
  })

  const onSubmit = async (data: any) => {
    setSaving(true)
    try { await onSave(data); onClose() } finally { setSaving(false) }
  }

  const handleReset2FA = async () => {
    setResetting2fa(true)
    try { await onReset2FA?.() } finally { setResetting2fa(false) }
  }

  const handleDisable2FA = async () => {
    setDisabling2fa(true)
    try { await onDisable2FA?.(); onClose() } finally { setDisabling2fa(false) }
  }

  const handleSubmit = user ? editForm.handleSubmit(onSubmit) : createForm.handleSubmit(onSubmit)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative glass-strong rounded-3xl border border-border w-full max-w-md p-6 shadow-card-lg max-h-[90vh] overflow-y-auto">
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
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Perfil</label>
            <select {...(user ? (editForm.register as any) : createForm.register)('role')} className="input-field appearance-none">
              <option value="vault_viewer">Visualizador</option>
              <option value="vault_manager">Gestor</option>
              <option value="org_admin">Administrador</option>
            </select>
          </div>

          {user ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated border border-border">
              <span className="text-sm text-txt-secondary">Conta ativa</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...editForm.register('isActive')} className="sr-only peer" />
                <div className="w-10 h-5 bg-bg-panel rounded-full peer peer-checked:bg-brand transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated border border-border">
              <div>
                <p className="text-sm text-txt-secondary">Exigir 2FA (Autenticador)</p>
                <p className="text-xs text-txt-muted mt-0.5">Gera QR Code para o Google Authenticator</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...createForm.register('require2fa')} className="sr-only peer" defaultChecked />
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

        {/* 2FA management (edit only) */}
        {user && (
          <div className="mt-5 pt-5 border-t border-border space-y-3">
            <p className="text-xs font-semibold text-txt-muted uppercase tracking-wide">Autenticação em 2 Fatores</p>

            <div className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated border border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn('w-4 h-4', (user as any).totpEnabled ? 'text-success' : 'text-txt-muted')} />
                <span className="text-sm text-txt-secondary">
                  2FA {(user as any).totpEnabled ? 'ativo' : 'inativo'}
                </span>
              </div>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg',
                (user as any).totpEnabled
                  ? 'text-success bg-success/10'
                  : 'text-txt-muted bg-bg-panel'
              )}>
                {(user as any).totpEnabled ? 'Habilitado' : 'Desabilitado'}
              </span>
            </div>

            <div className="flex gap-2">
              <button onClick={handleReset2FA} disabled={resetting2fa}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-brand/30 text-brand hover:bg-brand/5 transition-all text-xs font-medium disabled:opacity-50">
                <QrCode className="w-3.5 h-3.5" />
                {resetting2fa ? 'Gerando...' : 'Resetar / Novo QR'}
              </button>
              {(user as any).totpEnabled && (
                <button onClick={handleDisable2FA} disabled={disabling2fa}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-danger/30 text-danger hover:bg-danger/5 transition-all text-xs font-medium disabled:opacity-50">
                  <ShieldOff className="w-3.5 h-3.5" />
                  {disabling2fa ? 'Desativando...' : 'Desativar 2FA'}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function Users() {
  const qc = useQueryClient()
  const [search, setSearch]           = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [qrData, setQrData]           = useState<{ qrCode: string; otpSecret: string } | null>(null)

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
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      if (res?.setup?.qrCode) setQrData({ qrCode: res.setup.qrCode, otpSecret: res.setup.otpSecret })
    },
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

  const handleReset2FA = async (user: User) => {
    const result = await adminService.reset2FA(user.id)
    setModalOpen(false)
    setEditing(null)
    setQrData({ qrCode: result.qrCode, otpSecret: result.otpSecret })
    qc.invalidateQueries({ queryKey: ['users'] })
  }

  const handleDisable2FA = async (user: User) => {
    await adminService.disable2FA(user.id)
    qc.invalidateQueries({ queryKey: ['users'] })
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide">Perfil</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden md:table-cell">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden lg:table-cell">2FA</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden lg:table-cell">Data de Criação</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 shimmer-bg rounded" /></td></tr>
              ))
              : users.length === 0
              ? <tr><td colSpan={6} className="px-4 py-16 text-center text-txt-muted text-sm">Nenhum usuário encontrado</td></tr>
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
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg',
                      (user as any).totpEnabled ? 'text-success bg-success/10' : 'text-txt-muted bg-bg-elevated'
                    )}>
                      {(user as any).totpEnabled ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
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
            onReset2FA={editing ? () => handleReset2FA(editing) : undefined}
            onDisable2FA={editing ? () => handleDisable2FA(editing) : undefined}
          />
        )}

        {qrData && (
          <QrModal
            qrCode={qrData.qrCode}
            otpSecret={qrData.otpSecret}
            onClose={() => setQrData(null)}
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
