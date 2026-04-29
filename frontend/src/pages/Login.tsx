import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Mail, ArrowRight, Loader2, Smartphone, Eye, EyeOff, Building2, Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/utils/cn'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
const totpSchema = z.object({
  code: z.string().length(6, 'Código deve ter 6 dígitos').regex(/^\d{6}$/),
})

type LoginForm = z.infer<typeof loginSchema>
type TotpForm  = z.infer<typeof totpSchema>
type OrgOption = { id: string; name: string; slug: string; role: string }
type Step = 'credentials' | 'org_select' | 'totp'

const STEP_LABELS: Record<Step, string> = {
  credentials: 'Credenciais',
  org_select:  'Organização',
  totp:        'Verificação 2FA',
}
const STEPS: Step[] = ['credentials', 'org_select', 'totp']

export function Login() {
  const [step, setStep]           = useState<Step>('credentials')
  const [tempToken, setTempToken] = useState('')
  const [orgs, setOrgs]           = useState<OrgOption[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const totpForm  = useForm<TotpForm>({ resolver: zodResolver(totpSchema) })

  const finishAuth = async (accessToken: string, refreshToken: string) => {
    setTokens(accessToken, refreshToken)
    const user = await authService.getProfile()
    setUser(user)
    navigate('/dashboard', { replace: true })
  }

  const onLogin = async (data: LoginForm) => {
    setLoading(true); setError('')
    try {
      const res = await authService.login(data.email, data.password)

      if (res.requiresOrgSelection && res.organizations && res.organizations.length > 1) {
        setTempToken(res.tempToken ?? '')
        setOrgs(res.organizations)
        setSelectedOrgId(res.organizations[0].id)
        setStep('org_select')
        return
      }
      if (!res.requiresTwoFactor && res.accessToken && res.refreshToken) {
        await finishAuth(res.accessToken, res.refreshToken)
        return
      }
      setTempToken(res.tempToken ?? '')
      setStep('totp')
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Credenciais inválidas')
    } finally { setLoading(false) }
  }

  const onSelectOrg = async () => {
    if (!selectedOrgId) return
    setLoading(true); setError('')
    try {
      const res = await authService.selectOrg(tempToken, selectedOrgId)
      if (!res.requiresTwoFactor && res.accessToken && res.refreshToken) {
        await finishAuth(res.accessToken, res.refreshToken)
        return
      }
      setTempToken(res.tempToken ?? '')
      setStep('totp')
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Erro ao selecionar organização')
    } finally { setLoading(false) }
  }

  const onTotp = async (data: TotpForm) => {
    setLoading(true); setError('')
    try {
      const tokens = await authService.verify2FA(tempToken, data.code)
      await finishAuth(tokens.accessToken, tokens.refreshToken)
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Código inválido')
    } finally { setLoading(false) }
  }

  // Passos visíveis (remove org_select se não há multi-org)
  const visibleSteps: Step[] = orgs.length > 1
    ? ['credentials', 'org_select', 'totp']
    : ['credentials', 'totp']
  const stepIdx = visibleSteps.indexOf(step)

  return (
    <div className="w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4,0,0.2,1] }}
        className="glass-strong rounded-3xl p-8 shadow-card-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/sync2logo.png"
              alt="Sync2B Safeguard"
              className="w-16 h-16 rounded-2xl object-contain shadow-brand-lg animate-glow-pulse"
              draggable={false}
            />
          </div>
          <h2 className="text-2xl font-bold text-txt-primary mb-1">
            {step === 'credentials' ? 'Acesso Corporativo' :
             step === 'org_select'  ? 'Selecionar Organização' :
             'Verificação 2FA'}
          </h2>
          <p className="text-txt-secondary text-sm">
            {step === 'credentials' ? 'Autentique-se para acessar o cofre seguro' :
             step === 'org_select'  ? 'Escolha a organização que deseja acessar' :
             'Insira o código do Google Authenticator'}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {visibleSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300',
                step === s ? 'bg-brand border-brand text-white shadow-brand'
                  : i < stepIdx ? 'bg-brand/20 border-brand/40 text-brand'
                  : 'bg-transparent border-border text-txt-muted'
              )}>{i + 1}</div>
              {i < visibleSteps.length - 1 && (
                <div className={cn('flex-1 h-px', i < stepIdx ? 'bg-brand/40' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Credentials ── */}
          {step === 'credentials' && (
            <motion.form
              key="credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={loginForm.handleSubmit(onLogin)}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Email corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                  <input
                    {...loginForm.register('email')}
                    type="email"
                    placeholder="voce@empresa.com"
                    className="input-field pl-10"
                    autoComplete="email"
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-danger text-xs">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                  <input
                    {...loginForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    className="input-field pl-10 pr-10 font-mono"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-danger text-xs">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <a href="/forgot-password" className="text-xs text-brand hover:text-brand-dim transition-colors">
                  Esqueceu a senha?
                </a>
              </div>

              {error && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}}
                  className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
                  <span className="text-base">⚠</span> {error}
                </motion.div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Entrar <ArrowRight className="w-4 h-4" /></>}
              </button>
            </motion.form>
          )}

          {/* ── Step 1.5: Org selector ── */}
          {step === 'org_select' && (
            <motion.div
              key="org_select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                {orgs.map(org => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => setSelectedOrgId(org.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left',
                      selectedOrgId === org.id
                        ? 'bg-brand/10 border-brand/40 text-brand'
                        : 'bg-bg-elevated border-border hover:border-brand/20 text-txt-primary'
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                      selectedOrgId === org.id ? 'bg-brand/20' : 'bg-bg-panel'
                    )}>
                      <Building2 className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{org.name}</p>
                      <p className="text-xs text-txt-muted truncate">{org.slug}</p>
                    </div>
                    {selectedOrgId === org.id && (
                      <Check className="w-4 h-4 text-brand shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}}
                  className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
                  <span>⚠</span> {error}
                </motion.div>
              )}

              <button onClick={onSelectOrg} disabled={loading || !selectedOrgId}
                className="btn-primary w-full flex items-center justify-center gap-2 h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continuar <ArrowRight className="w-4 h-4" /></>}
              </button>

              <button type="button" onClick={() => { setStep('credentials'); setError('') }}
                className="w-full text-sm text-txt-muted hover:text-txt-primary transition-colors text-center">
                ← Voltar
              </button>
            </motion.div>
          )}

          {/* ── Step 2: TOTP ── */}
          {step === 'totp' && (
            <motion.form
              key="totp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={totpForm.handleSubmit(onTotp)}
              className="space-y-5"
            >
              <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-brand/5 border border-brand/15">
                <Smartphone className="w-8 h-8 text-brand" />
                <p className="text-sm text-txt-secondary text-center">
                  Abra o <span className="text-txt-primary font-semibold">Google Authenticator</span> e insira o código de 6 dígitos
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Código TOTP</label>
                <input
                  {...totpForm.register('code')}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  className="input-field text-center font-mono text-2xl tracking-[0.5em] h-14"
                  autoFocus
                />
                {totpForm.formState.errors.code && (
                  <p className="text-danger text-xs">{totpForm.formState.errors.code.message}</p>
                )}
              </div>

              {error && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}}
                  className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
                  <span>⚠</span> {error}
                </motion.div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Acessar <ArrowRight className="w-4 h-4" /></>}
              </button>

              <button type="button" onClick={() => { setStep(orgs.length > 1 ? 'org_select' : 'credentials'); setError('') }}
                className="w-full text-sm text-txt-muted hover:text-txt-primary transition-colors text-center">
                ← Voltar
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Security indicators */}
        <div className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-6">
          {[['🔐', 'AES-256-GCM'], ['🛡', 'TLS 1.3'], ['✅', 'SOC 2']].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-txt-muted">
              <span>{icon}</span>
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
