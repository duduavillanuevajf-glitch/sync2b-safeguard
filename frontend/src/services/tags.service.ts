import { api } from './api'
import type { Tag } from '@/types'

export const tagsService = {
  async list(includeInactive = false) {
    const { data } = await api.get('/tags', { params: includeInactive ? { all: 'true' } : undefined })
    return data.data as Tag[]
  },

  async create(payload: { name: string; color?: string; category?: string }) {
    const { data } = await api.post('/tags', payload)
    return data.data as Tag
  },

  async update(id: string, payload: { name?: string; color?: string; category?: string; isActive?: boolean }) {
    const { data } = await api.put(`/tags/${id}`, payload)
    return data.data as Tag
  },

  async delete(id: string) {
    await api.delete(`/tags/${id}`)
  },
}
