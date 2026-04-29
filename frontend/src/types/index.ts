export type Role = 'super_admin' | 'org_admin' | 'vault_manager' | 'vault_viewer' | string

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
  password?: string
  host?: string
  dns?: string
  port?: number
  notes?: string
  tags: string[]
  category?: string
  teamId?: string
  createdBy?: string
  createdByEmail?: string
  expiresAt?: string
  isArchived: boolean
  archivedAt?: string
  createdAt: string
  updatedAt: string
  staleDays?: number
}

export interface Tag {
  id: string
  name: string
  color: string
  category?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomRole {
  id: string
  name: string
  slug: string
  description?: string | null
  permissions: string[]
  isSystem: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
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
