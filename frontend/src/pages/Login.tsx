import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, Mail, ArrowRight, Loader2, Smartphone } from 'lucide-react'
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
type TotpForm = z.infer<typeof totpSchema>

export function Login() {
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials')
  const [tempToken, setTempToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const totpForm = useForm<TotpForm>({ resolver: zodResolver(totpSchema) })

  const onLogin = async (data: LoginForm) => {
    setLoading(true); setError('')
    try {
      const res = await authService.login(data.email, data.password)
      setTempToken(res.tempToken)
      setStep('totp')
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Credenciais inválidas')
    } finally { setLoading(false) }
  }

  const onTotp = async (data: TotpForm) => {
    setLoading(true); setError('')
    try {
      const tokens = await authService.verify2FA(tempToken, data.code)
      setTokens(tokens.accessToken, tokens.refreshToken)
      const user = await authService.getProfile()
      setUser(user)
      navigate('/dashboard')
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Código inválido')
    } finally { setLoading(false) }
  }

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
          <div className="inline-flex w-16 h-16 rounded-2xl bg-brand-gradient items-center justify-center shadow-brand-lg mb-4 animate-glow-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-txt-primary mb-1">
            {step === 'credentials' ? 'Bem-vindo de volta' : 'Verificação 2FA'}
          </h2>
          <p className="text-txt-secondary text-sm">
            {step === 'credentials'
              ? 'Acesse o cofre corporativo com segurança'
              : 'Insira o código do Google Authenticator'}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {['credentials', 'totp'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300',
                step === s ? 'bg-brand border-brand text-white shadow-brand'
                  : i < ['credentials','totp'].indexOf(step) ? 'bg-brand/20 border-brand/40 text-brand'
                  : 'bg-transparent border-border text-txt-muted'
              )}>{i + 1}</div>
              {i === 0 && <div className={cn('flex-1 h-px', step === 'totp' ? 'bg-brand/40' : 'bg-border')} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'credentials' ? (
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
                    type="password"
                    placeholder="••••••••••••"
                    className="input-field pl-10 font-mono"
                    autoComplete="current-password"
                  />
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
                  className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm"
                >
                  <span className="text-base">⚠</span> {error}
                </motion.div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continuar <ArrowRight className="w-4 h-4" /></>}
              </button>
            </motion.form>
          ) : (
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
                  className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm"
                >
                  <span>⚠</span> {error}
                </motion.div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Acessar <Shield className="w-4 h-4" /></>}
              </button>

              <button type="button" onClick={() => { setStep('credentials'); setError('') }}
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
