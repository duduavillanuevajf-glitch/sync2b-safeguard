import { useQuery } from '@tanstack/react-query'
import { KeyRound, Users, ShieldAlert, Activity, Clock, ArrowRight, Lock, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { SecurityScore } from '@/components/dashboard/SecurityScore'
import { ActivityChart } from '@/components/dashboard/ActivityChart'
import { ServiceBadge } from '@/components/ui/Badge'
import { vaultService, adminService } from '@/services/vault.service'
import { fDateTime, fRelative } from '@/utils/format'
import { useAuth } from '@/hooks/useAuth'
import { subDays, format } from 'date-fns'

function generateMockActivity() {
  return Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'dd/MM'),
    reads:  Math.floor(Math.random() * 80 + 20),
    writes: Math.floor(Math.random() * 30 + 5),
  }))
}

export function Dashboard() {
  const { user, hasPermission } = useAuth()

  const { data: vaultData, isLoading: loadingVault } = useQuery({
    queryKey: ['vault-summary'],
    queryFn: () => vaultService.list({ page: 1 }),
  })

  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['vault-alerts'],
    queryFn: () => vaultService.getAlerts(90),
    enabled: hasPermission('vault:read'),
  })

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-summary'],
    queryFn: () => adminService.listUsers({ limit: 5 }),
    enabled: hasPermission('users:read'),
  })

  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-recent'],
    queryFn: () => adminService.getAuditLogs({ limit: 8 }),
    enabled: hasPermission('audit:read'),
  })

  const totalItems = vaultData?.meta?.total ?? 0
  const staleCount = alerts?.length ?? 0
  const totalUsers = usersData?.meta?.total ?? 0
  const score = totalItems === 0 ? 100 : Math.max(0, Math.round(100 - (staleCount / Math.max(totalItems, 1)) * 100))

  const activityData = generateMockActivity()

  const actionMap: Record<string, { label: string; icon: string }> = {
    'vault:read':   { label: 'Leitura',   icon: '👁' },
    'vault:create': { label: 'Criação',   icon: '✚' },
    'vault:update': { label: 'Edição',    icon: '✏' },
    'vault:delete': { label: 'Exclusão',  icon: '🗑' },
    'auth:login':   { label: 'Login',     icon: '🔑' },
    'auth:logout':  { label: 'Logout',    icon: '🚪' },
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title="Dashboard"
        description={`Bem-vindo, ${user?.firstName || 'usuário'}. Aqui está o resumo de segurança.`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={KeyRound}
          label="Credenciais ativas"
          value={loadingVault ? '—' : totalItems}
          color="brand"
          loading={loadingVault}
          delay={0}
        />
        <StatsCard
          icon={ShieldAlert}
          label="Alertas de rotação"
          value={loadingAlerts ? '—' : staleCount}
          color={staleCount > 0 ? 'warn' : 'brand'}
          loading={loadingAlerts}
          delay={0.08}
        />
        <StatsCard
          icon={Users}
          label="Usuários ativos"
          value={loadingUsers ? '—' : totalUsers}
          color="info"
          loading={loadingUsers}
          delay={0.16}
        />
        <StatsCard
          icon={Lock}
          label="Score de segurança"
          value={score}
          delta="7 dias"
          deltaPositive={score >= 70}
          color={score >= 70 ? 'brand' : score >= 50 ? 'warn' : 'danger'}
          delay={0.24}
        />
      </div>

      {/* Chart + Score */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ActivityChart data={activityData} />
        </div>
        <div className="lg:col-span-2">
          <SecurityScore
            score={score}
            staleCount={staleCount}
            weakCount={0}
            totalItems={totalItems}
          />
        </div>
      </div>

      {/* Alerts + Recent Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stale alerts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl border border-border"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warn" />
              <span className="text-sm font-semibold text-txt-primary">Credenciais para rotacionar</span>
            </div>
            <Link to="/alerts" className="text-xs text-brand hover:text-brand-dim flex items-center gap-1 transition-colors">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loadingAlerts ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 shimmer-bg rounded-xl" />)}
            </div>
          ) : !alerts?.length ? (
            <div className="p-8 text-center text-txt-muted text-sm">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-success opacity-60" />
              Nenhum alerta pendente
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(alerts || []).slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <ServiceBadge service={item.serviceType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-txt-primary truncate">{item.title}</p>
                    <p className="text-xs text-txt-muted">{item.username}</p>
                  </div>
                  <span className="text-xs font-semibold text-warn bg-warn/10 px-2 py-1 rounded-lg flex-shrink-0">
                    {item.staleDays}d
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent activity */}
        {hasPermission('audit:read') && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass rounded-2xl border border-border"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-brand" />
                <span className="text-sm font-semibold text-txt-primary">Atividade recente</span>
              </div>
              <Link to="/audit" className="text-xs text-brand hover:text-brand-dim flex items-center gap-1 transition-colors">
                Ver log <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loadingAudit ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-10 shimmer-bg rounded-xl" />)}
              </div>
            ) : !auditData?.logs?.length ? (
              <div className="p-8 text-center text-txt-muted text-sm">Nenhuma atividade registrada</div>
            ) : (
              <div className="divide-y divide-border">
                {(auditData?.logs || []).slice(0, 7).map((log: any) => {
                  const act = actionMap[log.action] || { label: log.action, icon: '•' }
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <span className="text-base w-6 text-center">{act.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-txt-primary">{act.label}</p>
                        <p className="text-xs text-txt-muted truncate">{log.userEmail || 'Sistema'}</p>
                      </div>
                      <span className="text-xs text-txt-muted flex-shrink-0">{fRelative(log.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
