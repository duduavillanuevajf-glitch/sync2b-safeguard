import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, Sparkles } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { VaultItem } from '@/types'
import { PasswordField } from './PasswordField'
import { PasswordGenerator } from './PasswordGenerator'
import { cn } from '@/utils/cn'

const SERVICE_TYPES = ['SIP','SSH','MySQL','PostgreSQL','SFTP','RDP','HTTPS','API','Email','Outro']

const schema = z.object({
  title:       z.string().min(1, 'Título obrigatório'),
  serviceType: z.string().min(1),
  username:    z.string().min(1, 'Usuário obrigatório'),
  password:    z.string().min(1, 'Senha obrigatória'),
  host:        z.string().optional(),
  port:        z.coerce.number().int().min(1).max(65535).optional().or(z.literal('')),
  database:    z.string().optional(),
  notes:       z.string().optional(),
  tags:        z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  item?: VaultItem | null
  onClose: () => void
  onSave: (data: Partial<VaultItem>) => Promise<void>
}

export function CredentialModal({ open, item, onClose, onSave }: Props) {
  const [showGenerator, setShowGenerator] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: 'HTTPS' },
  })

  useEffect(() => {
    if (item) {
      reset({
        title: item.title,
        serviceType: item.serviceType || 'HTTPS',
        username: item.username,
        password: '',
        host: item.host || '',
        port: item.port || '',
        database: item.database || '',
        notes: item.notes || '',
        tags: item.tags?.join(', ') || '',
      })
    } else {
      reset({ serviceType: 'HTTPS' })
    }
    setShowGenerator(false)
  }, [item, open, reset])

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      await onSave({
        ...data,
        port: data.port ? Number(data.port) : undefined,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative glass-strong rounded-3xl border border-border w-full max-w-lg shadow-card-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 glass-strong rounded-t-3xl z-10">
              <h2 className="text-lg font-bold text-txt-primary">
                {item ? 'Editar Credencial' : 'Nova Credencial'}
              </h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* Title + Service */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Título</label>
                  <input {...register('title')} className="input-field" placeholder="ex: MySQL Produção" />
                  {errors.title && <p className="text-danger text-xs">{errors.title.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Serviço</label>
                  <div className="relative">
                    <select {...register('serviceType')} className="input-field appearance-none pr-8">
                      {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Usuário</label>
                <input {...register('username')} className="input-field font-mono" placeholder="admin@empresa.com" />
                {errors.username && <p className="text-danger text-xs">{errors.username.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Senha</label>
                  <button type="button" onClick={() => setShowGenerator(v => !v)}
                    className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors', showGenerator ? 'text-brand' : 'text-txt-muted hover:text-brand')}>
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
                      showStrength
                      placeholder={item ? '••••••••• (deixe vazio para manter)' : '••••••••••••'}
                    />
                  )}
                />
                {errors.password && <p className="text-danger text-xs">{errors.password.message}</p>}

                <AnimatePresence>
                  {showGenerator && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <PasswordGenerator onSelect={pwd => { setValue('password', pwd); setShowGenerator(false) }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Host + Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Host</label>
                  <input {...register('host')} className="input-field font-mono" placeholder="db.empresa.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Porta</label>
                  <input {...register('port')} className="input-field font-mono" placeholder="3306" type="number" />
                </div>
              </div>

              {/* Database */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Banco de dados</label>
                <input {...register('database')} className="input-field font-mono" placeholder="production_db" />
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Tags</label>
                <input {...register('tags')} className="input-field" placeholder="produção, crítico, backend" />
                <p className="text-xs text-txt-muted">Separe por vírgula</p>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Notas</label>
                <textarea {...register('notes')} rows={3} className="input-field resize-none" placeholder="Informações adicionais..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
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
