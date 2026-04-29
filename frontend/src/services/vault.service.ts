import { api } from './api'
import type { VaultItem, AuditLog, VaultHistory, ImportResult } from '@/types'

function normalizeMeta(meta: any) {
  const pg = meta?.pagination || meta || {}
  return {
    total: pg.total ?? 0,
    page: pg.page ?? 1,
    pages: pg.totalPages ?? pg.pages ?? 1,
    limit: pg.limit ?? 25,
  }
}

export const vaultService = {
  async list(params?: Record<string, string | number | boolean>) {
    const { data } = await api.get('/credentials', { params })
    return { items: data.data as VaultItem[], meta: normalizeMeta(data.meta) }
  },

  async get(id: string) {
    const { data } = await api.get(`/credentials/${id}`)
    return data.data as VaultItem
  },

  async create(payload: Partial<VaultItem> & { password?: string }) {
    const { data } = await api.post('/credentials', {
      name: payload.title,
      service: payload.serviceType,
      username: payload.username,
      password: payload.password,
      host: payload.host || undefined,
      dns: payload.dns || undefined,
      port: payload.port || undefined,
      notes: payload.notes || undefined,
      tags: payload.tags || [],
      category: payload.category || undefined,
      teamId: payload.teamId || undefined,
      expiresAt: payload.expiresAt || undefined,
    })
    return data.data
  },

  async update(id: string, payload: Partial<VaultItem> & { password?: string }) {
    await api.put(`/credentials/${id}`, {
      name: payload.title,
      service: payload.serviceType,
      username: payload.username,
      password: payload.password || undefined,
      host: payload.host || undefined,
      dns: payload.dns || undefined,
      port: payload.port || undefined,
      notes: payload.notes || undefined,
      tags: payload.tags || [],
      category: payload.category || undefined,
      teamId: payload.teamId || undefined,
      expiresAt: payload.expiresAt || undefined,
    })
  },

  async toggle(id: string) {
    const { data } = await api.patch(`/credentials/${id}/toggle`)
    return data.data as { isArchived: boolean }
  },

  async delete(id: string) {
    await api.delete(`/credentials/${id}`)
  },

  async getHistory(id: string) {
    const { data } = await api.get(`/credentials/${id}/history`)
    return data.data as VaultHistory[]
  },

  async getAlerts(alertDays?: number) {
    const { data } = await api.get('/credentials/alerts', { params: alertDays ? { alertDays } : undefined })
    return data.data as VaultItem[]
  },

  async exportCsv() {
    const { data } = await api.get('/credentials/export/csv', { responseType: 'blob' })
    return data
  },

  async exportXlsx() {
    const { data } = await api.get('/credentials/export/xlsx', { responseType: 'blob' })
    return data
  },

  async downloadTemplate() {
    const { data } = await api.get('/credentials/import/template', { responseType: 'blob' })
    return data
  },

  async import(file: File, strict = false) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/credentials/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { strict },
    })
    return data.data as ImportResult
  },

  async getAuditLogs(params?: Record<string, string | number>) {
    const { data } = await api.get('/credentials/history', { params })
    return { logs: data.data as AuditLog[], meta: normalizeMeta(data.meta) }
  },
}

export const adminService = {
  async listUsers(params?: Record<string, string | number>) {
    const { data } = await api.get('/admin/users', { params })
    return { users: data.data, meta: normalizeMeta(data.meta) }
  },

  async createUser(payload: { email: string; password: string; role: string; firstName?: string; lastName?: string }) {
    const { data } = await api.post('/admin/users', payload)
    return data.data
  },

  async updateUser(id: string, payload: { role?: string; firstName?: string; lastName?: string; isActive?: boolean }) {
    const { data } = await api.patch(`/admin/users/${id}`, payload)
    return data.data
  },

  async deleteUser(id: string) {
    await api.delete(`/admin/users/${id}`)
  },

  async getOrganization() {
    const { data } = await api.get('/admin/organization')
    return data.data
  },

  async updateOrganization(payload: { name?: string; alertDays?: number }) {
    const { data } = await api.patch('/admin/organization', payload)
    return data.data
  },

  async getAuditLogs(params?: Record<string, string | number>) {
    const { data } = await api.get('/admin/audit', { params })
    return { logs: data.data as AuditLog[], meta: normalizeMeta(data.meta) }
  },

  async listOrganizations() {
    const { data } = await api.get('/admin/organizations')
    return data.data as any[]
  },

  async createOrganization(payload: { name: string; slug: string; plan?: string; maxUsers?: number; maxVaultItems?: number; alertDays?: number }) {
    const { data } = await api.post('/admin/organizations', payload)
    return data.data
  },

  async toggleOrganization(id: string) {
    const { data } = await api.patch(`/admin/organizations/${id}/toggle`)
    return data.data
  },
}
