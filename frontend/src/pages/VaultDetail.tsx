import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, ArrowLeft, Edit, Trash2, Clock, Globe, Database, FileText, Tag, History, UsersRound, Eye, EyeOff, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { vaultService } from '@/services/vault.service'
import { teamsService } from '@/services/teams.service'
import { CredentialModal } from '@/components/vault/CredentialModal'
import { PasswordField } from '@/components/vault/PasswordField'
import { ServiceBadge, StatusBadge, AlertBadge } from '@/components/ui/Badge'
import { fDateTime, fRelative } from '@/utils/format'
import { useAuth } from '@/hooks/useAuth'
import type { VaultItem, VaultHistory } from '@/types'

export function VaultDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [revealError, setRevealError] = useState<string | null>(null)

  const { data: item, isLoading } = useQuery({
    queryKey: ['vault', id],
    queryFn: () => vaultService.get(id!),
    enabled: !!id,
  })

  const { data: history } = useQuery({
    queryKey: ['vault-history', id],
    queryFn: () => vaultService.getHistory(id!),
    enabled: !!id,
  })

  const updateMut = useMutation({
    mutationFn: (d: Partial<VaultItem> & { password?: string }) => vaultService.update(id!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault', id] }); setModalOpen(false) },
  })

  const deleteMut = useMutation({
    mutationFn: () => vaultService.delete(id!),
    onSuccess: () => navigate('/credenciais'),
  })

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsService.list(),
  })

  const handleReveal = async () => {
    if (revealedPassword !== null) { setRevealedPassword(null); setRevealError(null); return }
    setRevealing(true)
    setRevealError(null)
    try {
      const result = await vaultService.revealSecret(id!)
      setRevealedPassword(result.password)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Não foi possível revelar a senha.'
      setRevealError(msg)
    } finally {
      setRevealing(false)
    }
  }

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 shimmer-bg rounded-xl" />
      <div className="h-64 shimmer-bg rounded-2xl" />
    </div>
  )

  if (!item) return (
    <div className="text-center py-20 text-txt-muted">Credencial não encontrada</div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <button onClick={() => navigate('/credenciais')} className="flex items-center gap-1.5 text-sm text-txt-muted hover:text-txt-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar às credenciais
      </button>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-txt-primary">{item.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <ServiceBadge service={item.serviceType} />
                <StatusBadge active={!item.isArchived} />
                {item.staleDays && item.staleDays > 90 && <AlertBadge days={item.staleDays} />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasPermission('credential:update') && (
              <button onClick={() => setModalOpen(true)} className="btn-ghost flex items-center gap-1.5 text-sm">
                <Edit className="w-4 h-4" /> Editar
              </button>
            )}
            {hasPermission('credential:delete') && (
              <button onClick={() => setConfirmDelete(true)} className="btn-danger flex items-center gap-1.5 text-sm">
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Usuário</label>
            <div className="input-field font-mono text-txt-primary select-all">{item.username}</div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Senha</label>
            {hasPermission('credential:view_secret') ? (
              <div className="space-y-2">
                {revealedPassword !== null ? (
                  <PasswordField value={revealedPassword} readOnly />
                ) : (
                  <div className="input-field flex items-center gap-2 text-txt-muted select-none">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span className="text-sm">••••••••••••</span>
                  </div>
                )}
                <button onClick={handleReveal} disabled={revealing}
                  className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-dim transition-colors disabled:opacity-50">
                  {revealing ? (
                    <span>Carregando...</span>
                  ) : revealedPassword !== null ? (
                    <><EyeOff className="w-3.5 h-3.5" /> Ocultar senha</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5" /> Revelar senha</>
                  )}
                </button>
                {revealError && (
                  <p className="text-xs text-danger">{revealError}</p>
                )}
              </div>
            ) : (
              <div className="input-field flex items-center gap-2 text-txt-muted">
                <Lock className="w-4 h-4 shrink-0" />
                <span className="text-sm">Sem permissão para visualizar</span>
              </div>
            )}
          </div>

          {/* Equipe vinculada */}
          {item.category === 'compartilhada' && item.teamId && (
            <div className="flex items-center gap-2 text-sm text-txt-secondary">
              <UsersRound className="w-4 h-4 text-txt-muted" />
              <span>Equipe: <span className="font-medium text-txt-primary">
                {teams.find(t => t.id === item.teamId)?.name || item.teamId}
              </span></span>
            </div>
          )}
          {item.category === 'compartilhada' && !item.teamId && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-warn/10 border border-warn/20">
              <UsersRound className="w-4 h-4 text-warn" />
              <p className="text-xs text-warn">Credencial compartilhada sem equipe vinculada. Edite para associar uma equipe.</p>
            </div>
          )}

          {/* Host + Port */}
          {(item.host || item.port) && (
            <div className="flex items-center gap-2 text-sm text-txt-secondary">
              <Globe className="w-4 h-4 text-txt-muted" />
              <span className="font-mono">{item.host}{item.port ? `:${item.port}` : ''}</span>
            </div>
          )}

          {/* DNS */}
          {item.dns && (
            <div className="flex items-center gap-2 text-sm text-txt-secondary">
              <Database className="w-4 h-4 text-txt-muted" />
              <span className="font-mono">{item.dns}</span>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-txt-muted" />
              {item.tags.map(t => (
                <span key={t} className="badge bg-bg-elevated border border-border text-txt-secondary text-xs">{t}</span>
              ))}
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-txt-secondary uppercase tracking-wide">
                <FileText className="w-3.5 h-3.5" /> Notas
              </div>
              <p className="text-sm text-txt-secondary bg-bg-elevated rounded-xl p-3 border border-border whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-2 border-t border-border grid grid-cols-2 gap-3 text-xs text-txt-muted">
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />Criado: {fDateTime(item.createdAt)}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />Atualizado: {fRelative(item.updatedAt)}</span>
          </div>
        </div>
      </motion.div>

      {/* History */}
      {history && (history as VaultHistory[]).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <History className="w-4 h-4 text-brand" />
            <span className="text-sm font-semibold text-txt-primary">Histórico de alterações</span>
          </div>
          <div className="space-y-2">
            {(history as VaultHistory[]).map((h: VaultHistory) => (
              <div key={h.id} className="flex items-center gap-3 text-xs p-2 rounded-lg hover:bg-white/[0.02]">
                <span className="text-txt-muted font-mono">{fDateTime(h.createdAt)}</span>
                <span className="text-txt-secondary">{h.changedBy || 'Sistema'}</span>
                <span className="badge bg-bg-elevated border border-border text-txt-muted">{h.changeType}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Edit modal */}
      <CredentialModal
        open={modalOpen}
        item={item}
        onClose={() => setModalOpen(false)}
        onSave={async (d) => { await updateMut.mutateAsync(d) }}
      />

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="relative glass-strong rounded-2xl border border-border p-6 max-w-sm w-full shadow-card-lg"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-txt-primary mb-2">Excluir credencial</h3>
            <p className="text-sm text-txt-secondary mb-6">Excluir <span className="text-txt-primary font-semibold">{item.title}</span> permanentemente?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={() => deleteMut.mutate()} className="btn-danger flex-1">
                {deleteMut.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
