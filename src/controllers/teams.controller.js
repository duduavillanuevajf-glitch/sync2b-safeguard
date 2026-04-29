'use strict';

const teamsRepo = require('../repositories/teams.repository');
const userRepo  = require('../repositories/user.repository');
const auditRepo = require('../repositories/audit.repository');
const { success, created, noContent } = require('../utils/response');
const { NotFoundError, ConflictError, ForbiddenError } = require('../utils/errors');

function _ip(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

async function listTeams(req, res, next) {
  try {
    const teams = await teamsRepo.list(req.user.organizationId);
    success(res, teams);
  } catch (err) { next(err); }
}

async function createTeam(req, res, next) {
  try {
    const { name, description } = req.body;
    const team = await teamsRepo.create({
      organizationId: req.user.organizationId, name, description,
    });
    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'TEAM_CREATED', resourceType: 'team', resourceId: team.id,
      ipAddress: _ip(req), metadata: { name },
    });
    created(res, team, 'Equipe criada com sucesso');
  } catch (err) {
    if (err.code === '23505') return next(new ConflictError('Já existe uma equipe com esse nome'));
    next(err);
  }
}

async function getTeam(req, res, next) {
  try {
    const team = await teamsRepo.findById(req.params.id, req.user.organizationId);
    if (!team) throw new NotFoundError('Equipe');
    success(res, team);
  } catch (err) { next(err); }
}

async function updateTeam(req, res, next) {
  try {
    const { name, description, isActive } = req.body;
    const data = {};
    if (name !== undefined)        data.name = name;
    if (description !== undefined) data.description = description;
    if (isActive !== undefined)    data.is_active = isActive;

    const team = await teamsRepo.update(req.params.id, req.user.organizationId, data);
    if (!team) throw new NotFoundError('Equipe');

    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'TEAM_UPDATED', resourceType: 'team', resourceId: req.params.id,
      ipAddress: _ip(req), metadata: { fields: Object.keys(req.body) },
    });
    success(res, team, { message: 'Equipe atualizada' });
  } catch (err) {
    if (err.code === '23505') return next(new ConflictError('Já existe uma equipe com esse nome'));
    next(err);
  }
}

async function deleteTeam(req, res, next) {
  try {
    const deleted = await teamsRepo.delete(req.params.id, req.user.organizationId);
    if (!deleted) throw new NotFoundError('Equipe');
    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'TEAM_DELETED', resourceType: 'team', resourceId: req.params.id,
      ipAddress: _ip(req),
    });
    noContent(res);
  } catch (err) { next(err); }
}

async function listMembers(req, res, next) {
  try {
    const rows = await teamsRepo.listMembers(req.params.id, req.user.organizationId);
    const members = rows.map(m => ({
      userId: m.id,
      email: m.email,
      firstName: m.first_name || null,
      lastName: m.last_name || null,
      role: m.role,
      isActive: m.is_active,
      addedAt: m.added_at,
    }));
    success(res, members);
  } catch (err) { next(err); }
}

async function addMember(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) throw new ForbiddenError('userId é obrigatório');

    const user = await userRepo.findById(userId);
    if (!user || user.organization_id !== req.user.organizationId) {
      throw new NotFoundError('Usuário');
    }
    const team = await teamsRepo.findById(req.params.id, req.user.organizationId);
    if (!team) throw new NotFoundError('Equipe');

    await teamsRepo.addMember(req.params.id, userId);
    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'TEAM_MEMBER_ADDED', resourceType: 'team', resourceId: req.params.id,
      ipAddress: _ip(req), metadata: { userId, teamName: team.name },
    });
    success(res, null, { message: 'Membro adicionado' });
  } catch (err) { next(err); }
}

async function removeMember(req, res, next) {
  try {
    const removed = await teamsRepo.removeMember(req.params.id, req.params.userId);
    if (!removed) throw new NotFoundError('Membro');
    await auditRepo.log({
      organizationId: req.user.organizationId, userId: req.user.id,
      action: 'TEAM_MEMBER_REMOVED', resourceType: 'team', resourceId: req.params.id,
      ipAddress: _ip(req), metadata: { removedUserId: req.params.userId },
    });
    noContent(res);
  } catch (err) { next(err); }
}

module.exports = {
  listTeams, createTeam, getTeam, updateTeam, deleteTeam,
  listMembers, addMember, removeMember,
};
