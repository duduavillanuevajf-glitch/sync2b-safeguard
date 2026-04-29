import { api } from './api'

export interface Team {
  id: string
  name: string
  description?: string
  isActive: boolean
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  userId: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  addedAt: string
}

export const teamsService = {
  async list() {
    const { data } = await api.get('/teams')
    return data.data as Team[]
  },

  async create(payload: { name: string; description?: string }) {
    const { data } = await api.post('/teams', payload)
    return data.data as Team
  },

  async update(id: string, payload: { name?: string; description?: string; isActive?: boolean }) {
    const { data } = await api.put(`/teams/${id}`, payload)
    return data.data as Team
  },

  async delete(id: string) {
    await api.delete(`/teams/${id}`)
  },

  async listMembers(teamId: string) {
    const { data } = await api.get(`/teams/${teamId}/members`)
    return data.data as TeamMember[]
  },

  async addMember(teamId: string, userId: string) {
    const { data } = await api.post(`/teams/${teamId}/members`, { userId })
    return data.data
  },

  async removeMember(teamId: string, userId: string) {
    await api.delete(`/teams/${teamId}/members/${userId}`)
  },
}
