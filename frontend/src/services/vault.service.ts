import { api } from './api'
import type { VaultItem, AuditLog, VaultHistory, ImportResult } from '@/types'

export const vaultService = {
  async list(params?: Record<string, string | number | boolean>) {
    const { data } = await api.get('/vault', { params })
    return { items: data.data as VaultItem[], meta: data.meta }
  },

  async get(id: string) {
    const { data } = await api.get(`/vault/${id}`)
    return data.data as VaultItem
  },

  async create(payload: Partial<VaultItem>) {
    const { data } = await api.post('/vault', payload)
    return data.data
  },

  async update(id: string, payload: Partial<VaultItem>) {
    await api.put(`/vault/${id}`, payload)
  },

  async toggle(id: string) {
    const { data } = await api.patch(`/vault/${id}/toggle`)
    return data.data as { isArchived: boolean }
  },

  async delete(id: string) {
    await api.delete(`/vault/${id}`)
  },

  async getHistory(id: string) {
    const { data } = await api.get(`/vault/${id}/history`)
    return data.data as VaultHistory[]
  },

  async getAlerts(alertDays?: number) {
    const { data } = await api.get('/vault/alerts', { params: alertDays ? { alertDays } : undefined })
    return data.data as VaultItem[]
  },

  async exportCsv() {
    const { data } = await api.get('/vault/export/csv', { responseType: 'blob' })
    return data
  },

  async exportXlsx() {
    const { data } = await api.get('/vault/export/xlsx', { responseType: 'blob' })
    return data
  },

  async downloadTemplate() {
    const { data } = await api.get('/vault/import/template', { responseType: 'blob' })
    return data
  },

  async import(file: File, strict = false) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/vault/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { strict },
    })
    return data.data as ImportResult
  },

  async getAuditLogs(params?: Record<string, string | number>) {
    const { data } = await api.get('/vault/history', { params })
    return { logs: data.data as AuditLog[], meta: data.meta }
  },
}

export const adminService = {
  async listUsers(params?: Record<string, string | number>) {
    const { data } = await api.get('/admin/users', { params })
    return { users: data.data, meta: data.meta }
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
    return { logs: data.data as AuditLog[], meta: data.meta }
  },
}
