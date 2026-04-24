import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Smartphone, Loader2, ArrowRight, Check, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'

export function Setup2FA() {
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'qr' | 'verify'>('qr')
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

  useEffect(() => {
    api.post('/auth/2fa/setup').then(({ data }) => {
      setQr(data.data.qr)
      setSecret(data.data.secret)
    })
  }, [])

  const handleVerify = async () => {
    setLoading(true); setError('')
    try {
      await api.post('/auth/2fa/confirm', { code, secret })
      const user = await authService.getProfile()
      setUser(user)
      navigate('/dashboard')
    } catch {
      setError('Código inválido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-strong rounded-3xl p-8 shadow-card-lg"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-brand-gradient items-center justify-center shadow-brand-lg mb-4 animate-glow-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-txt-primary mb-1">Configurar 2FA</h2>
          <p className="text-txt-secondary text-sm">Proteja sua conta com autenticação em dois fatores</p>
        </div>

        {step === 'qr' ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 p-5 rounded-2xl bg-brand/5 border border-brand/15">
              <Smartphone className="w-6 h-6 text-brand" />
              <p className="text-sm text-txt-secondary text-center">
                Instale o <span className="font-semibold text-txt-primary">Google Authenticator</span> ou <span className="font-semibold text-txt-primary">Authy</span> e escaneie o QR code abaixo:
              </p>
              {qr ? (
                <img src={qr} alt="QR Code 2FA" className="w-44 h-44 rounded-2xl border border-border bg-white p-2" />
              ) : (
                <div className="w-44 h-44 rounded-2xl shimmer-bg" />
              )}
              {secret && (
                <div className="w-full p-3 rounded-xl bg-bg-elevated border border-border text-center">
                  <p className="text-xs text-txt-muted mb-1">Chave manual</p>
                  <code className="text-xs font-mono text-txt-primary tracking-wider break-all">{secret}</code>
                </div>
              )}
            </div>
            <button onClick={() => setStep('verify')} disabled={!qr} className="btn-primary w-full flex items-center justify-center gap-2 h-11">
              Já escaneei <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-brand/5 border border-brand/15">
              <Smartphone className="w-7 h-7 text-brand" />
              <p className="text-sm text-txt-secondary text-center">
                Insira o código de 6 dígitos do <span className="font-semibold text-txt-primary">Google Authenticator</span>
              </p>
            </div>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              type="text"
              inputMode="numeric"
              placeholder="000000"
              className="input-field text-center font-mono text-2xl tracking-[0.5em] h-14 w-full"
              autoFocus
            />
            {error && (
              <p className="text-danger text-sm text-center">⚠ {error}</p>
            )}
            <button onClick={handleVerify} disabled={code.length !== 6 || loading} className="btn-primary w-full flex items-center justify-center gap-2 h-11">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />Ativar e entrar</>}
            </button>
            <button type="button" onClick={() => setStep('qr')} className="w-full text-sm text-txt-muted hover:text-txt-primary transition-colors text-center">
              ← Voltar ao QR Code
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
