import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { User, Lock, Smartphone, Save, Check, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/Badge'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/services/api'

const profileSchema = z.object({
  firstName: z.string().min(1, 'Obrigatório'),
  lastName:  z.string().min(1, 'Obrigatório'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Obrigatório'),
  newPassword:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Senhas não conferem', path: ['confirmPassword'] })

type ProfileForm  = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export function Profile() {
  const { user, setUser } = useAuthStore()
  const [saved, setSaved] = useState(false)
  const [qrData, setQrData] = useState<{ qr: string; secret: string } | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName || '', lastName: user?.lastName || '' },
  })

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const profileMut = useMutation({
    mutationFn: async (d: ProfileForm) => {
      const { data } = await api.patch('/profile', d)
      return data.data
    },
    onSuccess: (u) => { setUser(u); setSaved(true); setTimeout(() => setSaved(false), 2500) },
  })

  const passwordMut = useMutation({
    mutationFn: async (d: PasswordForm) => {
      await api.patch('/profile/password', { currentPassword: d.currentPassword, newPassword: d.newPassword })
    },
    onSuccess: () => { passwordForm.reset(); setSaved(true); setTimeout(() => setSaved(false), 2500) },
  })

  const handleEnable2FA = async () => {
    const { data } = await api.post('/auth/2fa/setup')
    setQrData(data.data)
  }

  const handleConfirm2FA = async () => {
    setTotpLoading(true); setTotpError('')
    try {
      await api.post('/auth/2fa/confirm', { code: totpCode, secret: qrData?.secret })
      const u = await authService.getProfile()
      setUser(u)
      setQrData(null)
      setTotpCode('')
    } catch {
      setTotpError('Código inválido')
    } finally {
      setTotpLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    await api.delete('/auth/2fa')
    const u = await authService.getProfile()
    setUser(u)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader icon={User} title="Meu perfil" description="Gerencie suas informações pessoais e segurança" />

      {/* Identity */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="w-14 h-14 rounded-2xl bg-brand/15 border border-brand/25 flex items-center justify-center text-xl font-black text-brand">
            {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-txt-primary">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email}</p>
            <p className="text-sm text-txt-muted">{user?.email}</p>
            {user?.role && <div className="mt-1"><RoleBadge role={user.role} /></div>}
          </div>
        </div>
        <form onSubmit={profileForm.handleSubmit(d => profileMut.mutate(d))} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Nome</label>
              <input {...profileForm.register('firstName')} className="input-field" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Sobrenome</label>
              <input {...profileForm.register('lastName')} className="input-field" />
            </div>
          </div>
          <button type="submit" disabled={profileMut.isPending} className="btn-primary flex items-center gap-2 text-sm">
            {profileMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        </form>
      </motion.div>

      {/* Change password */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          <Lock className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold text-txt-primary">Alterar senha</h3>
        </div>
        <form onSubmit={passwordForm.handleSubmit(d => passwordMut.mutate(d))} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Senha atual</label>
            <input {...passwordForm.register('currentPassword')} type="password" className="input-field font-mono" placeholder="••••••••" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Nova senha</label>
            <input {...passwordForm.register('newPassword')} type="password" className="input-field font-mono" placeholder="••••••••" />
            {passwordForm.formState.errors.newPassword && <p className="text-danger text-xs">{passwordForm.formState.errors.newPassword.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Confirmar senha</label>
            <input {...passwordForm.register('confirmPassword')} type="password" className="input-field font-mono" placeholder="••••••••" />
            {passwordForm.formState.errors.confirmPassword && <p className="text-danger text-xs">{passwordForm.formState.errors.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={passwordMut.isPending} className="btn-primary flex items-center gap-2 text-sm">
            {passwordMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Alterar senha
          </button>
          {passwordMut.isError && <p className="text-danger text-xs">Senha atual incorreta</p>}
          {passwordMut.isSuccess && <p className="text-success text-xs">Senha alterada com sucesso!</p>}
        </form>
      </motion.div>

      {/* 2FA */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          <Smartphone className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold text-txt-primary">Autenticação em dois fatores</h3>
          {user?.totpEnabled
            ? <span className="ml-auto badge bg-success/10 text-success border border-success/20 text-xs">Ativo</span>
            : <span className="ml-auto badge bg-bg-elevated text-txt-muted border border-border text-xs">Inativo</span>
          }
        </div>

        {user?.totpEnabled ? (
          <div className="space-y-3">
            <p className="text-sm text-txt-secondary">O 2FA está ativo. Seu Google Authenticator protege este acesso.</p>
            <button onClick={handleDisable2FA} className="btn-danger text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Desativar 2FA
            </button>
          </div>
        ) : qrData ? (
          <div className="space-y-4">
            <p className="text-sm text-txt-secondary">Escaneie o QR code com o Google Authenticator e insira o código para confirmar:</p>
            <div className="flex justify-center">
              <img src={qrData.qr} alt="QR 2FA" className="w-40 h-40 rounded-xl border border-border" />
            </div>
            <input
              value={totpCode}
              onChange={e => setTotpCode(e.target.value)}
              maxLength={6}
              placeholder="000000"
              className="input-field text-center font-mono text-xl tracking-[0.5em] h-12"
            />
            {totpError && <p className="text-danger text-xs text-center">{totpError}</p>}
            <button onClick={handleConfirm2FA} disabled={totpCode.length !== 6 || totpLoading} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
              {totpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirmar e ativar 2FA
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-txt-secondary">Adicione uma camada extra de segurança com Google Authenticator ou Authy.</p>
            <button onClick={handleEnable2FA} className="btn-primary text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Ativar 2FA
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
