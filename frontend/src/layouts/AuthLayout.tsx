import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col overflow-hidden relative">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-mesh-bg pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand/[0.04] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-info/[0.03] blur-[100px] rounded-full pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between p-6 sm:p-8"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-gradient rounded-xl flex items-center justify-center shadow-brand">
            <Logo className="w-5 h-5" white />
          </div>
          <span className="font-bold text-xl text-txt-primary tracking-tight">
            Sync2B <span className="text-gradient-brand">Safeguard</span>
          </span>
        </div>

        {/* Theme toggle */}
        <ThemeToggle />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <Outlet />
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 text-center p-6 text-txt-muted text-xs"
      >
        © {new Date().getFullYear()} Sync2B Safeguard · Enterprise Password Vault ·{' '}
        <span className="text-brand/70">SOC 2 Ready</span>
      </motion.div>
    </div>
  )
}
