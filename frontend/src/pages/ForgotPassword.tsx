import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, Loader2, CheckCircle, Shield } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { authService } from '@/services/auth.service'

const schema = z.object({ email: z.string().email('Email inválido') })
type Form = z.infer<typeof schema>

export function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: Form) => {
    setLoading(true)
    try {
      await authService.forgotPassword(data.email)
      setEmail(data.email)
      setSent(true)
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4,0,0.2,1] }}
        className="glass-strong rounded-3xl p-8 shadow-card-lg"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-brand-gradient items-center justify-center shadow-brand-lg mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-txt-primary mb-1">Recuperar acesso</h2>
          <p className="text-txt-secondary text-sm">
            {sent ? 'Instruções enviadas para seu email' : 'Informe seu email corporativo'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
              <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-success/5 border border-success/20">
                <CheckCircle className="w-10 h-10 text-success" />
                <p className="text-sm text-txt-secondary text-center">
                  Se <span className="text-txt-primary font-semibold">{email}</span> estiver cadastrado, você receberá um link de redefinição em breve.
                </p>
              </div>
              <p className="text-xs text-txt-muted text-center">Verifique também a pasta de spam.</p>
            </motion.div>
          ) : (
            <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Email corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                  <input {...register('email')} type="email" placeholder="voce@empresa.com" className="input-field pl-10" autoFocus />
                </div>
                {errors.email && <p className="text-danger text-xs">{errors.email.message}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar instruções'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-6 text-center">
          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-txt-muted hover:text-txt-primary transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para o login
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
