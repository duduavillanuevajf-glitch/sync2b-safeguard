'use strict';

const { ForbiddenError } = require('../utils/errors');

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  VAULT_MANAGER: 'vault_manager',
  VAULT_VIEWER: 'vault_viewer',
};

const PERMISSIONS = {
  VAULT_CREATE: 'vault:create',
  VAULT_READ: 'vault:read',
  VAULT_UPDATE: 'vault:update',
  VAULT_DELETE: 'vault:delete',
  VAULT_EXPORT: 'vault:export',
  VAULT_IMPORT: 'vault:import',
  VAULT_TOGGLE: 'vault:toggle',
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  AUDIT_READ: 'audit:read',
  ORG_MANAGE: 'org:manage',
  TENANTS_MANAGE: 'tenants:manage',
};

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ORG_ADMIN]: [
    PERMISSIONS.VAULT_CREATE, PERMISSIONS.VAULT_READ, PERMISSIONS.VAULT_UPDATE,
    PERMISSIONS.VAULT_DELETE, PERMISSIONS.VAULT_EXPORT, PERMISSIONS.VAULT_IMPORT,
    PERMISSIONS.VAULT_TOGGLE, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_DELETE, PERMISSIONS.AUDIT_READ,
    PERMISSIONS.ORG_MANAGE,
  ],
  [ROLES.VAULT_MANAGER]: [
    PERMISSIONS.VAULT_CREATE, PERMISSIONS.VAULT_READ, PERMISSIONS.VAULT_UPDATE,
    PERMISSIONS.VAULT_DELETE, PERMISSIONS.VAULT_EXPORT, PERMISSIONS.VAULT_IMPORT,
    PERMISSIONS.VAULT_TOGGLE, PERMISSIONS.AUDIT_READ,
  ],
  [ROLES.VAULT_VIEWER]: [
    PERMISSIONS.VAULT_READ,
  ],
};

function hasPermission(role, permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    const { role } = req.user;
    const missing = permissions.find(p => !hasPermission(role, p));
    if (missing) {
      return next(new ForbiddenError(`Permissão insuficiente: ${missing}`));
    }
    next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Perfil insuficiente para esta ação'));
    }
    next();
  };
}

module.exports = { requirePermission, requireRole, ROLES, PERMISSIONS, hasPermission };
