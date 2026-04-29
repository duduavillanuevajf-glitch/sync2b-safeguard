'use strict';

const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const userRepo = require('../repositories/user.repository');
const orgRepo = require('../repositories/organization.repository');
const tokenRepo = require('../repositories/token.repository');
const auditRepo = require('../repositories/audit.repository');
const db = require('../config/database');
const { success, created, paginated, noContent } = require('../utils/response');
const { NotFoundError, ForbiddenError, ConflictError } = require('../utils/errors');
const { parsePagination } = require('../utils/pagination');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function _ip(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

function _normalizeUser(r) {
  return {
    id:          r.id,
    email:       r.email,
    role:        r.role,
    firstName:   r.first_name  || null,
    lastName:    r.last_name   || null,
    isActive:    r.is_active   ?? true,
    totpEnabled: r.otp_enabled ?? false,
    lastLoginAt: r.last_login_at || null,
    createdAt:   r.created_at,
    updatedAt:   r.updated_at  || null,
  };
}

// ── Organization ──────────────────────────────────────────────────────────────

async function getOrganization(req, res, next) {
  try {
    const org = await orgRepo.findById(req.user.organizationId);
    if (!org) throw new NotFoundError('Organização');
    success(res, org);
  } catch (err) { next(err); }
}

async function updateOrganization(req, res, next) {
  try {
    const payload = {};
    if (req.body.name) payload.name = req.body.name;
    if (req.body.alertDays) payload.alert_days = req.body.alertDays;
    if (req.body.settings) payload.settings = req.body.settings;

    const updated = await orgRepo.update(req.user.organizationId, payload);
    if (!updated) throw new NotFoundError('Organização');

    await auditRepo.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: 'ORGANIZATION_UPDATED',
      resourceType: 'organization',
      resourceId: req.user.organizationId,
      ipAddress: _ip(req),
      metadata: { fields: Object.keys(req.body) },
    });

    success(res, updated, { message: 'Organização atualizada' });
  } catch (err) { next(err); }
}

// ── Users ─────────────────────────────────────────────────────────────────────

async function listUsers(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const [rows, total] = await Promise.all([
      userRepo.listByOrganization(req.user.organizationId, { limit, offset }),
      userRepo.countByOrganization(req.user.organizationId),
    ]);
    paginated(res, rows.map(_normalizeUser), { total, page, limit });
  } catch (err) { next(err); }
}

async function createUser(req, res, next) {
  try {
    const { email, password, role, firstName, lastName, require2fa = true } = req.body;
    const org = await orgRepo.findById(req.user.organizationId);
    const userCount = await userRepo.countByOrganization(req.user.organizationId);
    if (userCount >= org.max_users) {
      throw new ForbiddenError(`Limite de ${org.max_users} usuários atingido para este plano`);
    }

    const existing = await userRepo.findByEmail(email, req.user.organizationId);
    if (existing) throw new ConflictError('Email já cadastrado nesta organização');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let otpSecretBase32 = null;
    let qrCode = null;
    if (require2fa !== false) {
      const otpSecret = speakeasy.generateSecret({ name: `Sync2B Safeguard (${email})` });
      otpSecretBase32 = otpSecret.base32;
      qrCode = await qrcode.toDataURL(otpSecret.otpauth_url);
    }

    const user = await userRepo.create({
      organizationId: req.user.organizationId,
      email,
      passwordHash,
      otpSecret: otpSecretBase32,
      role,
      firstName,
      lastName,
    });

    // Popula junction table para suporte multi-org
    try {
      await db.query(
        `INSERT INTO user_organizations (user_id, organization_id, role)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [user.id, req.user.organizationId, role]
      );
    } catch (_) { /* migration 004 pode não ter sido executada ainda */ }

    await auditRepo.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: 'USER_CREATED',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: _ip(req),
      metadata: { email, role, require2fa: require2fa !== false },
    });

    const responseData = { user: { id: user.id, email: user.email, role: user.role } };
    if (qrCode) {
      responseData.setup = { qrCode, otpSecret: otpSecretBase32 };
    }

    const message = qrCode
      ? 'Usuário criado. Compartilhe o QR Code com o usuário para configurar o Authenticator.'
      : 'Usuário criado sem 2FA. O usuário poderá configurar 2FA no primeiro acesso.';

    created(res, responseData, message);
  } catch (err) { next(err); }
}

async function getUser(req, res, next) {
  try {
    const user = await userRepo.findById(req.params.id);
    if (!user || user.organization_id !== req.user.organizationId) throw new NotFoundError('Usuário');
    success(res, {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    });
  } catch (err) { next(err); }
}

async function updateUser(req, res, next) {
  try {
    if (req.params.id === req.user.id && req.body.role && req.body.role !== req.user.role) {
      throw new ForbiddenError('Não é possível alterar seu próprio papel');
    }
    const fields = {};
    if (req.body.role !== undefined) fields.role = req.body.role;
    if (req.body.firstName !== undefined) fields.first_name = req.body.firstName;
    if (req.body.lastName !== undefined) fields.last_name = req.body.lastName;
    if (req.body.isActive !== undefined) fields.is_active = req.body.isActive;

    const updated = await userRepo.update(req.params.id, req.user.organizationId, fields);
    if (!updated) throw new NotFoundError('Usuário');

    if (req.body.isActive === false) {
      await tokenRepo.revokeAllForUser(req.params.id);
    }

    await auditRepo.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: 'USER_UPDATED',
      resourceType: 'user',
      resourceId: req.params.id,
      ipAddress: _ip(req),
      metadata: { fields: Object.keys(req.body) },
    });

    success(res, _normalizeUser(updated), { message: 'Usuário atualizado' });
  } catch (err) { next(err); }
}

async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) throw new ForbiddenError('Não é possível excluir sua própria conta');

    const user = await userRepo.findById(req.params.id);
    if (!user || user.organization_id !== req.user.organizationId) throw new NotFoundError('Usuário');

    await tokenRepo.revokeAllForUser(req.params.id);
    await userRepo.update(req.params.id, req.user.organizationId, { is_active: false });

    await auditRepo.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: 'USER_DEACTIVATED',
      resourceType: 'user',
      resourceId: req.params.id,
      ipAddress: _ip(req),
      metadata: { email: user.email },
    });

    noContent(res);
  } catch (err) { next(err); }
}

// ── Audit logs ────────────────────────────────────────────────────────────────

async function getAuditLogs(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const [rows, total] = await Promise.all([
      auditRepo.findByOrganization(req.user.organizationId, {
        limit, offset,
        action: req.query.action || null,
        userId: req.query.userId || null,
        resourceType: req.query.resourceType || null,
        from: req.query.from ? new Date(req.query.from) : null,
        to: req.query.to ? new Date(req.query.to) : null,
      }),
      auditRepo.countByOrganization(req.user.organizationId, {
        action: req.query.action || null,
        userId: req.query.userId || null,
      }),
    ]);
    paginated(res, rows, { total, page, limit });
  } catch (err) { next(err); }
}

// ── 2FA Management ────────────────────────────────────────────────────────────

async function reset2FA(req, res, next) {
  try {
    const user = await userRepo.findById(req.params.id);
    if (!user || user.organization_id !== req.user.organizationId) throw new NotFoundError('Usuário');

    const otpSecret = speakeasy.generateSecret({ name: `Sync2B Safeguard (${user.email})` });
    await userRepo.resetOtpSecret(req.params.id, req.user.organizationId, otpSecret.base32);
    await tokenRepo.revokeAllForUser(req.params.id);

    const qrCode = await qrcode.toDataURL(otpSecret.otpauth_url);

    await auditRepo.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: '2FA_RESET',
      resourceType: 'user',
      resourceId: req.params.id,
      ipAddress: _ip(req),
      metadata: { targetEmail: user.email },
    });

    success(res, { qrCode, otpSecret: otpSecret.base32 }, { message: '2FA resetado. Compartilhe o novo QR Code com o usuário.' });
  } catch (err) { next(err); }
}

async function disable2FA(req, res, next) {
  try {
    const user = await userRepo.findById(req.params.id);
    if (!user || user.organization_id !== req.user.organizationId) throw new NotFoundError('Usuário');
    if (req.params.id === req.user.id) throw new ForbiddenError('Não é possível desativar seu próprio 2FA por aqui');

    await userRepo.disableOtp(req.params.id, req.user.organizationId);
    await tokenRepo.revokeAllForUser(req.params.id);

    await auditRepo.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: '2FA_DISABLED',
      resourceType: 'user',
      resourceId: req.params.id,
      ipAddress: _ip(req),
      metadata: { targetEmail: user.email },
    });

    noContent(res);
  } catch (err) { next(err); }
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

async function getDashboardStats(req, res, next) {
  try {
    const orgId = req.user.organizationId;

    // Atividade dos últimos 30 dias: leituras (ACCESSED/LOGIN_SUCCESS) e escritas (CREATED/UPDATED/DELETED)
    const { rows: activityRows } = await db.query(
      `SELECT
         DATE(created_at AT TIME ZONE 'America/Sao_Paulo') AS day,
         COUNT(*) FILTER (WHERE action IN ('CREDENTIAL_CREATED','CREDENTIAL_UPDATED','CREDENTIAL_DELETED','USER_CREATED','USER_UPDATED','TEAM_CREATED')) AS writes,
         COUNT(*) FILTER (WHERE action IN ('LOGIN_SUCCESS','CREDENTIAL_ARCHIVED','CREDENTIAL_UNARCHIVED')) AS reads
       FROM audit_logs
       WHERE organization_id = $1
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY day
       ORDER BY day`,
      [orgId]
    );

    // Preenche os 30 dias (mesmo dias sem eventos)
    const activity = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = activityRows.find(r => r.day.toISOString().slice(0, 10) === key);
      activity.push({
        date: label,
        reads:  found ? parseInt(found.reads, 10)  : 0,
        writes: found ? parseInt(found.writes, 10) : 0,
      });
    }

    success(res, { activity });
  } catch (err) { next(err); }
}

// ── Organizations (super_admin only) ─────────────────────────────────────────

async function listOrganizations(req, res, next) {
  try {
    const orgs = await orgRepo.listAll();
    success(res, orgs);
  } catch (err) { next(err); }
}

async function createOrganization(req, res, next) {
  try {
    const { name, slug, plan, maxUsers, maxVaultItems, alertDays } = req.body;
    const existing = await orgRepo.findBySlug(slug);
    if (existing) throw new ConflictError('Slug já utilizado');
    const org = await orgRepo.create({ name, slug });
    if (plan || maxUsers || maxVaultItems || alertDays) {
      await orgRepo.update(org.id, {
        plan: plan || undefined,
        max_users: maxUsers || undefined,
        max_vault_items: maxVaultItems || undefined,
        alert_days: alertDays || undefined,
      });
    }
    await auditRepo.log({
      organizationId: org.id, userId: req.user.id,
      action: 'ORGANIZATION_CREATED', resourceType: 'organization', resourceId: org.id,
      ipAddress: _ip(req), metadata: { name, slug },
    });
    created(res, org, 'Organização criada com sucesso');
  } catch (err) { next(err); }
}

async function toggleOrganization(req, res, next) {
  try {
    const org = await orgRepo.findById(req.params.id);
    if (!org) throw new NotFoundError('Organização');
    const updated = await orgRepo.update(req.params.id, { is_active: !org.is_active });
    await auditRepo.log({
      organizationId: req.params.id, userId: req.user.id,
      action: 'ORGANIZATION_TOGGLED', resourceType: 'organization', resourceId: req.params.id,
      ipAddress: _ip(req), metadata: { is_active: updated.is_active },
    });
    success(res, updated, { message: updated.is_active ? 'Organização ativada' : 'Organização desativada' });
  } catch (err) { next(err); }
}

module.exports = {
  getOrganization, updateOrganization,
  listOrganizations, createOrganization, toggleOrganization,
  listUsers, createUser, getUser, updateUser, deleteUser,
  getAuditLogs,
  reset2FA, disable2FA,
  getDashboardStats,
};
