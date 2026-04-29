import { api } from './api'
import type { CustomRole } from '@/types'

export const rolesService = {
  async list() {
    const { data } = await api.get('/roles')
    return data.data as CustomRole[]
  },

  async create(payload: { name: string; description?: string; permissions: string[] }) {
    const { data } = await api.post('/roles', payload)
    return data.data as CustomRole
  },

  async update(id: string, payload: { name?: string; description?: string; permissions?: string[]; isActive?: boolean }) {
    const { data } = await api.put(`/roles/${id}`, payload)
    return data.data as CustomRole
  },

  async delete(id: string) {
    await api.delete(`/roles/${id}`)
  },

  async duplicate(id: string, name: string) {
    const { data } = await api.post(`/roles/${id}/duplicate`, { name })
    return data.data as CustomRole
  },
}
