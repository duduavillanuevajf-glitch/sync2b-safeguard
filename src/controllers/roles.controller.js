'use strict';

const rolesRepo = require('../repositories/roles.repository');
const auditRepo = require('../repositories/audit.repository');
const { success, created, noContent } = require('../utils/response');
const { NotFoundError, ConflictError, ForbiddenError } = require('../utils/errors');

function _normalize(r) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description || null,
    permissions: r.permissions || [],
    isSystem: r.is_system,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function _ip(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

async function listRoles(req, res, next) {
  try {
    const rows = await rolesRepo.list(req.user.organizationId);
    success(res, rows.map(_normalize));
  } catch (err) { next(err); }
}

async function createRole(req, res, next) {
  try {
    const { name, description, permissions } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const role = await rolesRepo.create({
      organizationId: req.user.organizationId, name, slug, description, permissions: permissions || [],
    });
    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'ROLE_CREATED', resourceType: 'custom_role', resourceId: role.id,
      ipAddress: _ip(req), metadata: { name, slug },
    });
    created(res, _normalize(role), 'Perfil criado com sucesso');
  } catch (err) {
    if (err.code === '23505') return next(new ConflictError('Já existe um perfil com esse nome'));
    next(err);
  }
}

async function updateRole(req, res, next) {
  try {
    const { name, description, permissions, isActive } = req.body;
    const existing = await rolesRepo.findById(req.params.id, req.user.organizationId);
    if (!existing) throw new NotFoundError('Perfil');

    const data = {};
    if (name !== undefined) { data.name = name; data.slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''); }
    if (description !== undefined) data.description = description;
    if (permissions !== undefined) data.permissions = permissions;
    if (isActive !== undefined) data.is_active = isActive;

    const role = await rolesRepo.update(req.params.id, req.user.organizationId, data);
    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'ROLE_UPDATED', resourceType: 'custom_role', resourceId: req.params.id,
      ipAddress: _ip(req), metadata: { fields: Object.keys(req.body) },
    });
    success(res, _normalize(role), { message: 'Perfil atualizado' });
  } catch (err) {
    if (err.code === '23505') return next(new ConflictError('Já existe um perfil com esse nome'));
    next(err);
  }
}

async function deleteRole(req, res, next) {
  try {
    const existing = await rolesRepo.findById(req.params.id, req.user.organizationId);
    if (!existing) throw new NotFoundError('Perfil');
    if (existing.is_system) throw new ForbiddenError('Perfis de sistema não podem ser excluídos');

    const deleted = await rolesRepo.delete(req.params.id, req.user.organizationId);
    if (!deleted) throw new NotFoundError('Perfil');

    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'ROLE_DELETED', resourceType: 'custom_role', resourceId: req.params.id,
      ipAddress: _ip(req), metadata: { name: existing.name },
    });
    noContent(res);
  } catch (err) { next(err); }
}

async function duplicateRole(req, res, next) {
  try {
    const { name } = req.body;
    const role = await rolesRepo.duplicate(req.params.id, req.user.organizationId, name || 'Cópia');
    if (!role) throw new NotFoundError('Perfil');
    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'ROLE_DUPLICATED', resourceType: 'custom_role', resourceId: role.id,
      ipAddress: _ip(req), metadata: { sourceId: req.params.id, name: role.name },
    });
    created(res, _normalize(role), 'Perfil duplicado com sucesso');
  } catch (err) {
    if (err.code === '23505') return next(new ConflictError('Já existe um perfil com esse nome'));
    next(err);
  }
}

module.exports = { listRoles, createRole, updateRole, deleteRole, duplicateRole };
