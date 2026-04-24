import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import { useNavigate } from 'react-router-dom'

export function useAuth() {
  const { user, isAuthenticated, logout: storeLogout } = useAuthStore()
  const navigate = useNavigate()

  const logout = async () => {
    const { refreshToken } = useAuthStore.getState()
    try { if (refreshToken) await authService.logout(refreshToken) } catch {}
    storeLogout()
    navigate('/login')
  }

  const hasRole = (...roles: string[]) => !!user && roles.includes(user.role)

  const hasPermission = (permission: string) => {
    if (!user) return false
    const rolePerms: Record<string, string[]> = {
      super_admin: ['*'],
      org_admin: ['vault:read','vault:create','vault:update','vault:delete','vault:export','vault:import','vault:toggle','users:read','users:create','users:update','users:delete','audit:read','org:manage'],
      vault_manager: ['vault:read','vault:create','vault:update','vault:delete','vault:export','vault:import','vault:toggle','audit:read'],
      vault_viewer: ['vault:read'],
    }
    const perms = rolePerms[user.role] || []
    return perms.includes('*') || perms.includes(permission)
  }

  return { user, isAuthenticated, logout, hasRole, hasPermission }
}
