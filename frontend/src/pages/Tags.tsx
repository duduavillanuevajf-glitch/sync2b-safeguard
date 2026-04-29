import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, Plus, Edit, Trash2, X, Power, PowerOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { tagsService } from '@/services/tags.service'
import { cn } from '@/utils/cn'
import type { Tag as TagType } from '@/types'

const TAG_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
  '#eab308','#22c55e','#14b8a6','#3b82f6','#64748b',
]

const TAG_CATEGORIES = ['', 'infraestrutura', 'segurança', 'financeiro', 'cliente', 'produção', 'desenvolvimento', 'redes', 'cloud']

const tagSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(50),
  color: z.string().optional(),
  category: z.string().optional(),
})
type TagForm = z.infer<typeof tagSchema>

function TagModal({ tag, onClose, onSave }: { tag?: TagType | null; onClose: () => void; onSave: (d: TagForm) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TagForm>({
    resolver: zodResolver(tagSchema),
    defaultValues: tag ? { name: tag.name, color: tag.color, category: tag.category || '' } : { color: '#6366f1', category: '' },
  })

  const selectedColor = watch('color') || '#6366f1'

  const onSubmit = async (data: TagForm) => {
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
          <h2 className="text-lg font-bold text-txt-primary">{tag ? 'Editar tag' : 'Nova tag'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated border border-border">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-sm font-medium"
              style={{ backgroundColor: selectedColor + '20', borderColor: selectedColor + '40', color: selectedColor }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedColor }} />
              {watch('name') || 'preview'}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Nome</label>
            <input {...register('name')} className="input-field" placeholder="ex: produção, crítico, sip..." />
            {errors.name && <p className="text-danger text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Cor</label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setValue('color', c)}
                  className={cn('w-8 h-8 rounded-lg border-2 transition-all', selectedColor === c ? 'border-white scale-110' : 'border-transparent')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Categoria (opcional)</label>
            <select {...register('category')} className="input-field">
              {TAG_CATEGORIES.map(c => <option key={c} value={c}>{c || '— Sem categoria —'}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Salvando...' : tag ? 'Atualizar' : 'Criar tag'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export function Tags() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TagType | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TagType | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags', showInactive],
    queryFn: () => tagsService.list(showInactive),
  })

  const createMut = useMutation({
    mutationFn: (d: TagForm) => tagsService.create(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: TagForm }) => tagsService.update(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => tagsService.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => tagsService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); setConfirmDelete(null) },
  })

  const handleSave = async (d: TagForm) => {
    if (editing) await updateMut.mutateAsync({ id: editing.id, d })
    else await createMut.mutateAsync(d)
  }

  const byCategory = tags.reduce<Record<string, TagType[]>>((acc, t) => {
    const key = t.category || 'Geral'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Tag}
        title="Tags"
        description={`${tags.filter(t => t.isActive).length} tag(s) ativa(s)`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowInactive(v => !v)}
              className={cn('btn-ghost text-sm flex items-center gap-1.5', showInactive && 'text-brand')}>
              {showInactive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
              {showInactive ? 'Ocultar inativas' : 'Mostrar inativas'}
            </button>
            <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Nova tag
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 shimmer-bg rounded-2xl" />)}
        </div>
      ) : tags.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-16 text-center">
          <Tag className="w-12 h-12 mx-auto mb-3 text-txt-muted opacity-40" />
          <p className="text-txt-muted text-sm mb-2">Nenhuma tag cadastrada</p>
          <p className="text-txt-muted text-xs mb-4">Crie tags para organizar suas credenciais por projeto, ambiente ou criticidade.</p>
          <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-primary text-sm">
            Criar primeira tag
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([category, categoryTags]) => (
            <div key={category}>
              <p className="text-xs font-bold text-txt-muted uppercase tracking-widest mb-3 px-1">{category}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {categoryTags.map((tag, i) => (
                  <motion.div key={tag.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className={cn('glass rounded-2xl border p-4 flex flex-col gap-3 group transition-colors',
                      tag.isActive ? 'border-border hover:border-brand/30' : 'border-border/40 opacity-50')}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium"
                        style={{ backgroundColor: tag.color + '20', borderColor: tag.color + '40', color: tag.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => { setEditing(tag); setModalOpen(true) }}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
                          <Edit className="w-3 h-3" />
                        </button>
                        <button onClick={() => toggleMut.mutate({ id: tag.id, isActive: !tag.isActive })}
                          className={cn('w-6 h-6 rounded-md flex items-center justify-center transition-all',
                            tag.isActive ? 'text-txt-muted hover:text-warn hover:bg-warn/10' : 'text-success hover:bg-success/10')}>
                          {tag.isActive ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                        </button>
                        <button onClick={() => setConfirmDelete(tag)}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-txt-muted hover:text-danger hover:bg-danger/10 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md self-start',
                      tag.isActive ? 'text-success bg-success/10' : 'text-txt-muted bg-bg-elevated')}>
                      {tag.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <TagModal
            tag={editing}
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
              <h3 className="text-lg font-bold text-txt-primary mb-2">Excluir tag</h3>
              <p className="text-sm text-txt-secondary mb-6">
                Excluir a tag <span className="font-semibold" style={{ color: confirmDelete.color }}>{confirmDelete.name}</span>?
                As credenciais que usam esta tag não serão afetadas.
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
