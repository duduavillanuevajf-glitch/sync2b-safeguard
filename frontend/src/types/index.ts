export type Role = 'super_admin' | 'org_admin' | 'vault_manager' | 'vault_viewer'

export interface Organization {
  id: string
  name: string
  slug: string
  plan: string
  maxUsers: number
  maxVaultItems: number
  alertDays: number
  isActive: boolean
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  role: Role
  firstName?: string
  lastName?: string
  isActive: boolean
  totpEnabled?: boolean
  lastLoginAt?: string
  createdAt: string
  organization: {
    id: string
    name: string
    slug: string
    alertDays: number
  }
}

export interface VaultItem {
  id: string
  title: string
  serviceType?: string
  username: string
  host?: string
  port?: number
  database?: string
  notes?: string
  tags: string[]
  isArchived: boolean
  archivedAt?: string
  createdAt: string
  updatedAt: string
  createdByEmail?: string
  staleDays?: number
}

export interface AuditLog {
  id: string
  organizationId?: string
  userId?: string
  userEmail?: string
  action: string
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  requestId?: string
  status: 'success' | 'failure'
  metadata: Record<string, unknown>
  createdAt: string
}

export interface VaultHistory {
  id: string
  vaultItemId: string
  changedById?: string
  changedBy?: string
  changeType: string
  changedFields?: Record<string, unknown>
  ipAddress?: string
  createdAt: string
}

export interface ImportResult {
  jobId?: string
  total: number
  imported: number
  failed: number
  skipped?: number
  errors?: Array<{ row: number; message: string }>
  rolledBack?: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
  meta?: {
    pagination?: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNextPage: boolean
      hasPrevPage: boolean
    }
  }
  requestId?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export type ServiceType = 'SIP' | 'SSH' | 'MySQL' | 'PostgreSQL' | 'RDP' | 'FTP' | 'HTTPS' | 'HTTP' | 'SMTP' | 'LDAP' | 'Outro'
