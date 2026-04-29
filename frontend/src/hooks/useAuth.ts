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
      org_admin: ['credential:read','credential:create','credential:update','credential:delete','credential:export','credential:import','credential:toggle','users:read','users:create','users:update','users:delete','audit:read','org:manage','tags:manage','roles:manage'],
      vault_manager: ['credential:read','credential:create','credential:update','credential:delete','credential:export','credential:import','credential:toggle','audit:read','tags:manage'],
      vault_viewer: ['credential:read'],
    }
    const perms = rolePerms[user.role] || []
    return perms.includes('*') || perms.includes(permission)
  }

  return { user, isAuthenticated, logout, hasRole, hasPermission }
}
