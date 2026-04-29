import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, KeyRound, ScrollText, Users,
  Upload, Bell, Settings, User, ChevronLeft, ChevronRight,
  LogOut, Building2, ShieldCheck, UsersRound,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import { authService } from '@/services/auth.service'

const NAV = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard',      section: 'main' },
  { to: '/credenciais',    icon: KeyRound,        label: 'Credenciais',    section: 'main' },
  { to: '/alerts',         icon: Bell,            label: 'Alertas',        section: 'main', badge: 'warn' },
  { to: '/import',         icon: Upload,          label: 'Importação',     section: 'main' },
  { to: '/audit',          icon: ScrollText,      label: 'Auditoria',      section: 'manage' },
  { to: '/users',          icon: Users,           label: 'Usuários',       section: 'manage' },
  { to: '/equipes',        icon: UsersRound,      label: 'Equipes',        section: 'manage' },
  { to: '/organizacoes',   icon: Building2,       label: 'Organizações',   section: 'manage' },
  { to: '/permissions',    icon: ShieldCheck,     label: 'Permissões',     section: 'manage' },
  { to: '/settings',       icon: Settings,        label: 'Configurações',  section: 'system' },
  { to: '/profile',        icon: User,            label: 'Perfil',         section: 'system' },
]

const SECTIONS: Record<string, string> = {
  main:   'Principal',
  manage: 'Gestão',
  system: 'Sistema',
}

export function Sidebar() {
  const { sidebarCollapsed: collapsed, toggleSidebar } = useUIStore()
  const { user, logout, refreshToken } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (refreshToken) await authService.logout(refreshToken)
    logout()
    navigate('/login')
  }

  const sections = [...new Set(NAV.map(n => n.section))]

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen bg-bg-secondary border-r border-border shrink-0 overflow-hidden"
    >
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-brand-gradient opacity-40" />

      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border shrink-0">
        <img
          src="/sync2logo.png"
          alt="Sync2B"
          className="w-9 h-9 rounded-xl object-contain shrink-0"
          draggable={false}
        />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="ml-3 font-bold text-txt-primary whitespace-nowrap text-[15px] tracking-tight"
            >
              Sync2B <span className="text-gradient-brand">Safeguard</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-1">
        {sections.map((section) => (
          <div key={section} className="mb-2">
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-txt-muted/60"
                >
                  {SECTIONS[section]}
                </motion.p>
              )}
            </AnimatePresence>
            {NAV.filter(n => n.section === section).map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative',
                  isActive
                    ? 'bg-brand/10 text-brand shadow-inset-brand border border-brand/15'
                    : 'text-txt-secondary hover:text-txt-primary hover:bg-white/[0.04]'
                )}
                title={collapsed ? label : undefined}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="active-nav"
                        className="absolute inset-0 rounded-xl bg-brand/[0.08]"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <Icon className={cn('w-[18px] h-[18px] shrink-0 relative z-10', isActive && 'text-brand')} />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.15 }}
                          className="text-sm font-medium whitespace-nowrap relative z-10"
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="shrink-0 border-t border-border p-3 space-y-1">
        {/* Org badge */}
        <AnimatePresence>
          {!collapsed && user?.organization && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg bg-brand/5 border border-brand/10"
            >
              <Building2 className="w-3.5 h-3.5 text-brand shrink-0" />
              <span className="text-xs text-brand font-medium truncate">{user.organization.name}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn('flex items-center gap-3 px-3 py-2 rounded-xl', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white font-bold text-xs shrink-0">
            {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-txt-primary truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}
                </p>
                <p className="text-[11px] text-txt-muted truncate">{user?.role?.replace('_', ' ')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={toggleSidebar}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-txt-muted',
            'hover:text-txt-primary hover:bg-white/[0.04] transition-all duration-200',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed
            ? <ChevronRight className="w-[17px] h-[17px] shrink-0" />
            : <ChevronLeft className="w-[17px] h-[17px] shrink-0" />
          }
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="text-sm font-medium"
              >
                Recolher
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-txt-secondary',
            'hover:text-danger hover:bg-danger/[0.06] transition-all duration-200',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="w-[17px] h-[17px] shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="text-sm font-medium"
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
