import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, Sparkles, User, Globe, Server, Tag, Calendar, Shield, UsersRound } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import type { VaultItem } from '@/types'
import { PasswordField } from './PasswordField'
import { PasswordGenerator } from './PasswordGenerator'
import { cn } from '@/utils/cn'
import { teamsService } from '@/services/teams.service'
import { tagsService } from '@/services/tags.service'

const SERVICE_TYPES = ['SIP','SSH','MySQL','PostgreSQL','SFTP','RDP','HTTPS','API','Email','Outro']
const CATEGORIES = [
  { value: '',              label: 'Sem categoria' },
  { value: 'pessoal',      label: 'Pessoal (só o criador vê)' },
  { value: 'compartilhada',label: 'Compartilhada (por equipe)' },
]

const schema = z.object({
  title:       z.string().min(1, 'Nome obrigatório'),
  category:    z.string().optional(),
  teamId:      z.string().optional(),
  serviceType: z.string().min(1),
  username:    z.string().min(1, 'Usuário obrigatório'),
  password:    z.string().optional(),
  host:        z.string().optional(),
  dns:         z.string().optional(),
  port:        z.coerce.number().int().min(1).max(65535).optional().or(z.literal('')),
  notes:       z.string().optional(),
  tags:        z.array(z.string()).optional(),
  expiresAt:   z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.category === 'compartilhada' && !data.teamId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Equipe obrigatória para credencial compartilhada', path: ['teamId'] })
  }
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  item?: VaultItem | null
  onClose: () => void
  onSave: (data: Partial<VaultItem> & { password?: string }) => Promise<void>
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] font-bold text-txt-muted uppercase tracking-widest">
      {children}{required && <span className="text-danger ml-0.5">*</span>}
    </label>
  )
}

export function CredentialModal({ open, item, onClose, onSave }: Props) {
  const [showGenerator, setShowGenerator] = useState(false)
  const [saving, setSaving] = useState(false)

  const {
    register, handleSubmit, control, setValue, setError, reset, watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: 'HTTPS', category: '', tags: [] },
  })

  const selectedCategory = watch('category')
  const selectedTags = watch('tags') || []

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsService.list(),
    enabled: open,
  })

  const { data: availableTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.list(),
    enabled: open,
  })

  useEffect(() => {
    if (item) {
      reset({
        title:       item.title,
        category:    item.category || '',
        teamId:      item.teamId || '',
        serviceType: item.serviceType || 'HTTPS',
        username:    item.username,
        password:    '',
        host:        item.host || '',
        dns:         item.dns || '',
        port:        item.port || '',
        notes:       item.notes || '',
        tags:        item.tags || [],
        expiresAt:   item.expiresAt ? item.expiresAt.substring(0, 10) : '',
      })
    } else {
      reset({ serviceType: 'HTTPS', category: '', tags: [] })
    }
    setShowGenerator(false)
  }, [item, open, reset])

  const toggleTag = (tagName: string) => {
    const current = selectedTags
    if (current.includes(tagName)) {
      setValue('tags', current.filter(t => t !== tagName))
    } else {
      setValue('tags', [...current, tagName])
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!item && !data.password) {
      setError('password', { type: 'manual', message: 'Senha obrigatória para nova credencial' })
      return
    }
    setSaving(true)
    try {
      await onSave({
        title:       data.title,
        serviceType: data.serviceType,
        category:    data.category || undefined,
        teamId:      data.category === 'compartilhada' ? data.teamId : undefined,
        username:    data.username,
        password:    data.password || undefined,
        host:        data.host || undefined,
        dns:         data.dns || undefined,
        port:        data.port ? Number(data.port) : undefined,
        notes:       data.notes || undefined,
        tags:        data.tags || [],
        expiresAt:   data.expiresAt || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative glass-strong rounded-3xl border border-border w-full max-w-xl shadow-card-lg max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 glass-strong rounded-t-3xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-brand" />
                </div>
                <h2 className="text-base font-bold text-txt-primary">
                  {item ? 'Editar Credencial' : 'Nova Credencial'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

              {/* Identificação */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-brand uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-3 h-px bg-brand/40 inline-block" />
                  Identificação
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <FieldLabel required>Nome</FieldLabel>
                    <input
                      {...register('title')}
                      className="input-field"
                      placeholder="ex: MySQL Produção"
                      autoFocus
                    />
                    {errors.title && <p className="text-danger text-xs">{errors.title.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Categoria</FieldLabel>
                    <div className="relative">
                      <select {...register('category')} className="input-field appearance-none pr-8">
                        {CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Equipe — obrigatória quando categoria = compartilhada */}
                <AnimatePresence>
                  {selectedCategory === 'compartilhada' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5"
                    >
                      <FieldLabel required>Equipe vinculada</FieldLabel>
                      <div className="relative">
                        <UsersRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted pointer-events-none" />
                        <select {...register('teamId')} className="input-field appearance-none pl-10 pr-8">
                          <option value="">— Selecione a equipe —</option>
                          {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted pointer-events-none" />
                      </div>
                      {errors.teamId && <p className="text-danger text-xs">{errors.teamId.message}</p>}
                      <p className="text-xs text-txt-muted">Apenas membros desta equipe terão acesso.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <FieldLabel>Tipo de serviço</FieldLabel>
                  <div className="relative">
                    <select {...register('serviceType')} className="input-field appearance-none pr-8">
                      {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Acesso */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-brand uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-3 h-px bg-brand/40 inline-block" />
                  Acesso
                </p>

                <div className="space-y-1.5">
                  <FieldLabel required>Usuário</FieldLabel>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                    <input
                      {...register('username')}
                      className="input-field pl-10 font-mono"
                      placeholder="admin@empresa.com"
                    />
                  </div>
                  {errors.username && <p className="text-danger text-xs">{errors.username.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <FieldLabel>{item ? 'Senha (vazio = manter)' : 'Senha'}{!item && <span className="text-danger ml-0.5">*</span>}</FieldLabel>
                    <button
                      type="button"
                      onClick={() => setShowGenerator(v => !v)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs font-medium transition-colors',
                        showGenerator ? 'text-brand' : 'text-txt-muted hover:text-brand'
                      )}
                    >
                      <Sparkles className="w-3 h-3" />
                      Gerar senha
                    </button>
                  </div>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <PasswordField
                        value={field.value || ''}
                        onChange={field.onChange}
                        showStrength={!item}
                        placeholder={item ? '••••••••• (inalterada)' : '••••••••••••'}
                      />
                    )}
                  />
                  {errors.password && <p className="text-danger text-xs">{errors.password.message}</p>}

                  <AnimatePresence>
                    {showGenerator && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <PasswordGenerator
                          onSelect={pwd => { setValue('password', pwd); setShowGenerator(false) }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Conexão */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-brand uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-3 h-px bg-brand/40 inline-block" />
                  Conexão
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <FieldLabel>Host</FieldLabel>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                      <input
                        {...register('host')}
                        className="input-field pl-10 font-mono"
                        placeholder="db.empresa.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Porta</FieldLabel>
                    <input
                      {...register('port')}
                      className="input-field font-mono"
                      placeholder="3306"
                      type="number"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>DNS</FieldLabel>
                  <div className="relative">
                    <Server className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                    <input
                      {...register('dns')}
                      className="input-field pl-10 font-mono"
                      placeholder="servidor.dominio.local"
                    />
                  </div>
                </div>
              </div>

              {/* Metadados */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-brand uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-3 h-px bg-brand/40 inline-block" />
                  Metadados
                </p>

                {/* Tags reais */}
                <div className="space-y-1.5">
                  <FieldLabel>Tags</FieldLabel>
                  {availableTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map(tag => {
                        const selected = selectedTags.includes(tag.name)
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.name)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                              selected
                                ? 'bg-brand/20 border-brand/40 text-brand'
                                : 'bg-bg-elevated border-border text-txt-muted hover:border-brand/30 hover:text-txt-primary'
                            )}
                            style={selected ? {} : { borderColor: tag.color + '40' }}
                          >
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-1.5"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-bg-elevated border border-border">
                      <Tag className="w-4 h-4 text-txt-muted" />
                      <p className="text-xs text-txt-muted">Nenhuma tag cadastrada. Crie em <span className="text-brand">Tags</span> no menu lateral.</p>
                    </div>
                  )}
                  {selectedTags.length > 0 && (
                    <p className="text-xs text-txt-muted">{selectedTags.length} tag(s) selecionada(s)</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>Expiração</FieldLabel>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                    <input
                      {...register('expiresAt')}
                      type="date"
                      className="input-field pl-10"
                      min={new Date().toISOString().substring(0, 10)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>Observações</FieldLabel>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Informações adicionais, contexto de uso..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-border">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Salvando...' : item ? 'Atualizar' : 'Criar credencial'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
