import { api } from './api'
import type { AuthTokens, User } from '@/types'

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    return data.data as {
      requiresTwoFactor?: boolean
      requiresOrgSelection?: boolean
      tempToken?: string
      accessToken?: string
      refreshToken?: string
      expiresIn?: string
      organizations?: Array<{ id: string; name: string; slug: string; role: string }>
    }
  },

  async selectOrg(tempToken: string, organizationId: string) {
    const { data } = await api.post('/auth/select-org', { tempToken, organizationId })
    return data.data as {
      requiresTwoFactor?: boolean
      tempToken?: string
      accessToken?: string
      refreshToken?: string
      expiresIn?: string
    }
  },

  async verify2FA(tempToken: string, totpCode: string) {
    const { data } = await api.post('/auth/2fa/verify', { tempToken, totpCode })
    return data.data as AuthTokens
  },

  async register(payload: { orgName: string; orgSlug: string; email: string; password: string; firstName?: string; lastName?: string }) {
    const { data } = await api.post('/auth/register', payload)
    return data.data
  },

  async forgotPassword(email: string) {
    await api.post('/auth/forgot-password', { email })
  },

  async validateResetToken(token: string) {
    const { data } = await api.get('/auth/reset-password/validate', { params: { token } })
    return data.data as { valid: boolean; email: string }
  },

  async resetPassword(token: string, totpCode: string, newPassword: string) {
    await api.post('/auth/reset-password', { token, totpCode, newPassword })
  },

  async logout(refreshToken: string) {
    await api.post('/auth/logout', { refreshToken }).catch(() => {})
  },

  async getProfile() {
    const { data } = await api.get('/profile')
    return data.data as User
  },

  async changePassword(currentPassword: string, newPassword: string) {
    await api.post('/profile/change-password', { currentPassword, newPassword })
  },
}
