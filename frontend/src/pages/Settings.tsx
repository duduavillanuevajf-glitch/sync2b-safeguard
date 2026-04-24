import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings as SettingsIcon, Building2, Bell, Save, Loader2, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { adminService } from '@/services/vault.service'

const orgSchema = z.object({
  name:      z.string().min(1, 'Obrigatório'),
  alertDays: z.coerce.number().int().min(7).max(365),
})

type OrgForm = z.infer<typeof orgSchema>

export function Settings() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => adminService.getOrganization(),
  })

  const orgForm = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    values: org ? { name: org.name, alertDays: org.alertDays ?? 90 } : undefined,
  })

  const updateMut = useMutation({
    mutationFn: (d: OrgForm) => adminService.updateOrganization(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader icon={SettingsIcon} title="Configurações" description="Gerencie as configurações da organização" />

      {/* Organization */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          <Building2 className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold text-txt-primary">Organização</h3>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-10 shimmer-bg rounded-xl" />)}
          </div>
        ) : (
          <form onSubmit={orgForm.handleSubmit(d => updateMut.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Nome da organização</label>
              <input {...orgForm.register('name')} className="input-field" />
              {orgForm.formState.errors.name && <p className="text-danger text-xs">{orgForm.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">
                Alerta de rotação (dias)
              </label>
              <input {...orgForm.register('alertDays')} type="number" min={7} max={365} className="input-field" />
              <p className="text-xs text-txt-muted">Credenciais não atualizadas há mais de X dias aparecerão nos alertas.</p>
            </div>

            <button type="submit" disabled={updateMut.isPending} className="btn-primary flex items-center gap-2 text-sm">
              {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Salvo!' : 'Salvar configurações'}
            </button>
          </form>
        )}
      </motion.div>

      {/* Info tiles */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          <Bell className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold text-txt-primary">Segurança e conformidade</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {[
            ['🔐', 'Criptografia', 'AES-256-GCM com rotação de chaves e versionamento'],
            ['🛡', 'Transporte',   'TLS 1.3 obrigatório em todas as conexões'],
            ['📋', 'Auditoria',    'Todos os acessos registrados com IP e timestamp'],
            ['🔄', 'Tokens',       'JWT com refresh token rotation e detecção de reuso'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-bg-elevated border border-border">
              <span className="text-lg mt-0.5">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-txt-primary">{title}</p>
                <p className="text-xs text-txt-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Version */}
      <div className="text-center text-xs text-txt-muted pb-2">
        Sync2B Safeguard · Enterprise Edition · v2.0.0
      </div>
    </div>
  )
}
