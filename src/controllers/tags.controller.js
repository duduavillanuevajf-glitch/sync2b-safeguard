'use strict';

const tagsRepo = require('../repositories/tags.repository');
const auditRepo = require('../repositories/audit.repository');
const { success, created, noContent } = require('../utils/response');
const { NotFoundError, ConflictError } = require('../utils/errors');

function _normalize(r) {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    category: r.category || null,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function _ip(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

async function listTags(req, res, next) {
  try {
    const includeInactive = req.query.all === 'true';
    const rows = await tagsRepo.list(req.user.organizationId, { includeInactive });
    success(res, rows.map(_normalize));
  } catch (err) { next(err); }
}

async function createTag(req, res, next) {
  try {
    const { name, color, category } = req.body;
    const tag = await tagsRepo.create({ organizationId: req.user.organizationId, name, color, category });
    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'TAG_CREATED', resourceType: 'tag', resourceId: tag.id,
      ipAddress: _ip(req), metadata: { name },
    });
    created(res, _normalize(tag), 'Tag criada com sucesso');
  } catch (err) {
    if (err.code === '23505') return next(new ConflictError('Já existe uma tag com esse nome'));
    next(err);
  }
}

async function updateTag(req, res, next) {
  try {
    const { name, color, category, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    if (category !== undefined) data.category = category;
    if (isActive !== undefined) data.is_active = isActive;

    const tag = await tagsRepo.update(req.params.id, req.user.organizationId, data);
    if (!tag) throw new NotFoundError('Tag');

    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'TAG_UPDATED', resourceType: 'tag', resourceId: req.params.id,
      ipAddress: _ip(req), metadata: { fields: Object.keys(req.body) },
    });
    success(res, _normalize(tag), { message: 'Tag atualizada' });
  } catch (err) {
    if (err.code === '23505') return next(new ConflictError('Já existe uma tag com esse nome'));
    next(err);
  }
}

async function deleteTag(req, res, next) {
  try {
    const deleted = await tagsRepo.delete(req.params.id, req.user.organizationId);
    if (!deleted) throw new NotFoundError('Tag');
    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'TAG_DELETED', resourceType: 'tag', resourceId: req.params.id,
      ipAddress: _ip(req),
    });
    noContent(res);
  } catch (err) { next(err); }
}

module.exports = { listTags, createTag, updateTag, deleteTag };
