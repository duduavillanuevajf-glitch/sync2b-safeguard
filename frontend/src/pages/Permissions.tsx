import { Shield, Check, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/Badge'
import type { Role } from '@/types'

const ROLES: Role[] = ['super_admin', 'org_admin', 'vault_manager', 'vault_viewer']

const PERMISSIONS = [
  { group: 'Cofre', items: [
    { key: 'vault:read',   label: 'Visualizar credenciais' },
    { key: 'vault:create', label: 'Criar credenciais' },
    { key: 'vault:update', label: 'Editar credenciais' },
    { key: 'vault:delete', label: 'Excluir credenciais' },
    { key: 'vault:export', label: 'Exportar cofre' },
    { key: 'vault:import', label: 'Importar credenciais' },
    { key: 'vault:toggle', label: 'Arquivar/ativar' },
  ]},
  { group: 'Usuários', items: [
    { key: 'users:read',   label: 'Visualizar usuários' },
    { key: 'users:create', label: 'Criar usuários' },
    { key: 'users:update', label: 'Editar usuários' },
    { key: 'users:delete', label: 'Remover usuários' },
  ]},
  { group: 'Administração', items: [
    { key: 'audit:read',    label: 'Acessar auditoria' },
    { key: 'org:manage',   label: 'Gerenciar organização' },
    { key: 'tenants:manage', label: 'Gerenciar tenants (super)' },
  ]},
]

const ROLE_PERMS: Record<Role, string[]> = {
  super_admin:    ['*'],
  org_admin:      ['vault:read','vault:create','vault:update','vault:delete','vault:export','vault:import','vault:toggle','users:read','users:create','users:update','users:delete','audit:read','org:manage'],
  vault_manager:  ['vault:read','vault:create','vault:update','vault:delete','vault:export','vault:import','vault:toggle','audit:read'],
  vault_viewer:   ['vault:read'],
}

function hasPermission(role: Role, perm: string) {
  const perms = ROLE_PERMS[role]
  return perms.includes('*') || perms.includes(perm)
}

export function Permissions() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="Matriz de Permissões"
        description="Controle de acesso baseado em funções (RBAC)"
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-4 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide min-w-[200px]">Permissão</th>
                {ROLES.map(r => (
                  <th key={r} className="px-4 py-4 text-center">
                    <RoleBadge role={r} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(group => (
                <>
                  <tr key={group.group} className="bg-bg-elevated/50">
                    <td colSpan={ROLES.length + 1} className="px-5 py-2 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      {group.group}
                    </td>
                  </tr>
                  {group.items.map((perm, i) => (
                    <motion.tr
                      key={perm.key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-t border-border hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm text-txt-primary">{perm.label}</p>
                        <p className="text-xs text-txt-muted font-mono">{perm.key}</p>
                      </td>
                      {ROLES.map(role => (
                        <td key={role} className="px-4 py-3 text-center">
                          {hasPermission(role, perm.key) ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/15 border border-success/25">
                              <Check className="w-3.5 h-3.5 text-success" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-elevated border border-border">
                              <X className="w-3.5 h-3.5 text-txt-muted/40" />
                            </span>
                          )}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
