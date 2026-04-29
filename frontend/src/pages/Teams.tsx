import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UsersRound, Plus, Search, Edit, Trash2, Users, X, UserPlus, UserMinus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { teamsService, type Team, type TeamMember, type OrgUser } from '@/services/teams.service'
import { cn } from '@/utils/cn'

const teamSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  description: z.string().optional(),
})
type TeamForm = z.infer<typeof teamSchema>

function TeamModal({ team, onClose, onSave }: { team?: Team | null; onClose: () => void; onSave: (d: TeamForm) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
    defaultValues: team ? { name: team.name, description: team.description || '' } : {},
  })

  const onSubmit = async (data: TeamForm) => {
    setSaving(true)
    try { await onSave(data); onClose() } finally { setSaving(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative glass-strong rounded-3xl border border-border w-full max-w-md p-6 shadow-card-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-txt-primary">{team ? 'Editar equipe' : 'Nova equipe'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Nome</label>
            <input {...register('name')} className="input-field" placeholder="Ex: TI, DevOps, Suporte..." />
            {errors.name && <p className="text-danger text-xs">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Descrição (opcional)</label>
            <textarea {...register('description')} className="input-field resize-none h-20" placeholder="Descreva o propósito desta equipe..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Salvando...' : team ? 'Atualizar' : 'Criar equipe'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function MembersPanel({ team, onClose }: { team: Team; onClose: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['team-members', team.id],
    queryFn: () => teamsService.listMembers(team.id),
  })

  const { data: orgUsers = [] } = useQuery({
    queryKey: ['org-users'],
    queryFn: () => teamsService.listOrgUsers(),
  })

  const addMut = useMutation({
    mutationFn: (userId: string) => teamsService.addMember(team.id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', team.id] }),
  })

  const removeMut = useMutation({
    mutationFn: (userId: string) => teamsService.removeMember(team.id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', team.id] }),
  })

  const memberIds = new Set(members.map((m: TeamMember) => m.userId))
  const available = orgUsers.filter((u: OrgUser) =>
    !memberIds.has(u.id) &&
    (search === '' || u.email.includes(search) || (u.firstName || '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative glass-strong rounded-3xl border border-border w-full max-w-2xl p-6 shadow-card-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-txt-primary">Membros — {team.name}</h2>
            <p className="text-xs text-txt-muted mt-0.5">{members.length} membro(s)</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Membros atuais */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Na equipe</p>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {loadingMembers ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 shimmer-bg rounded-xl" />)}</div>
              ) : members.length === 0 ? (
                <p className="text-xs text-txt-muted text-center py-8">Nenhum membro ainda</p>
              ) : members.map((m: TeamMember) => (
                <div key={m.userId} className="flex items-center gap-2 p-2 rounded-xl bg-bg-elevated border border-border group">
                  <div className="w-7 h-7 rounded-lg bg-brand/15 flex items-center justify-center text-xs font-bold text-brand shrink-0">
                    {(m.firstName?.[0] || m.email[0]).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-txt-primary truncate">{m.firstName ? `${m.firstName} ${m.lastName || ''}`.trim() : m.email}</p>
                    <p className="text-[10px] text-txt-muted truncate">{m.email}</p>
                  </div>
                  <button onClick={() => removeMut.mutate(m.userId)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-txt-muted hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100">
                    <UserMinus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Usuários disponíveis */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Adicionar usuário</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..." className="input-field pl-8 py-1.5 text-sm" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {available.length === 0 ? (
                <p className="text-xs text-txt-muted text-center py-8">Sem usuários disponíveis</p>
              ) : available.map((u: OrgUser) => (
                <div key={u.id} className="flex items-center gap-2 p-2 rounded-xl bg-bg-elevated border border-border group">
                  <div className="w-7 h-7 rounded-lg bg-bg-panel flex items-center justify-center text-xs font-bold text-txt-muted shrink-0">
                    {(u.firstName?.[0] || u.email[0]).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-txt-primary truncate">{u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.email}</p>
                    <p className="text-[10px] text-txt-muted truncate">{u.email}</p>
                  </div>
                  <button onClick={() => addMut.mutate(u.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-txt-muted hover:text-brand hover:bg-brand/10 transition-all opacity-0 group-hover:opacity-100">
                    <UserPlus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function Teams() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [membersTeam, setMembersTeam] = useState<Team | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null)

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsService.list(),
  })

  const createMut = useMutation({
    mutationFn: (d: TeamForm) => teamsService.create(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: TeamForm }) => teamsService.update(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => teamsService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); setConfirmDelete(null) },
  })

  const filtered = teams.filter(t =>
    search === '' || t.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (d: TeamForm) => {
    if (editing) await updateMut.mutateAsync({ id: editing.id, d })
    else await createMut.mutateAsync(d)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UsersRound}
        title="Equipes"
        description={`${teams.length} equipe(s) na organização`}
        actions={
          <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Nova equipe
          </button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar equipe..." className="input-field pl-10 w-full" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-36 shimmer-bg rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-16 text-center">
          <UsersRound className="w-12 h-12 mx-auto mb-3 text-txt-muted opacity-40" />
          <p className="text-txt-muted text-sm">Nenhuma equipe encontrada</p>
          <button onClick={() => { setEditing(null); setModalOpen(true) }}
            className="mt-4 btn-primary text-sm">Criar primeira equipe</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((team, i) => (
            <motion.div key={team.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass rounded-2xl border border-border p-5 flex flex-col gap-4 group hover:border-brand/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                    <UsersRound className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-txt-primary">{team.name}</p>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                      team.isActive ? 'text-success bg-success/10' : 'text-txt-muted bg-bg-elevated')}>
                      {team.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => { setEditing(team); setModalOpen(true) }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(team)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-danger hover:bg-danger/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {team.description && (
                <p className="text-xs text-txt-muted line-clamp-2">{team.description}</p>
              )}

              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-1.5 text-txt-muted">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs">{team.memberCount} membro(s)</span>
                </div>
                <button onClick={() => setMembersTeam(team)}
                  className="text-xs text-brand hover:text-brand-dim transition-colors font-medium">
                  Gerenciar membros →
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <TeamModal
            team={editing}
            onClose={() => { setModalOpen(false); setEditing(null) }}
            onSave={handleSave}
          />
        )}
        {membersTeam && (
          <MembersPanel team={membersTeam} onClose={() => setMembersTeam(null)} />
        )}
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="relative glass-strong rounded-2xl border border-border p-6 max-w-sm w-full shadow-card-lg">
              <h3 className="text-lg font-bold text-txt-primary mb-2">Excluir equipe</h3>
              <p className="text-sm text-txt-secondary mb-6">
                Excluir <span className="text-txt-primary font-semibold">{confirmDelete.name}</span>? As credenciais vinculadas perderão o acesso compartilhado.
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
