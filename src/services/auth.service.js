'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { v4: uuid } = require('uuid');

const userRepo = require('../repositories/user.repository');
const orgRepo = require('../repositories/organization.repository');
const tokenRepo = require('../repositories/token.repository');
const auditRepo = require('../repositories/audit.repository');
const cryptoSvc = require('./crypto.service');
const emailSvc = require('./email.service');
const secrets = require('../config/secrets');
const db = require('../config/database');
const {
  AuthenticationError, ConflictError, ValidationError,
  NotFoundError, ForbiddenError,
} = require('../utils/errors');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL_DAYS = 7;

// ── JWT helpers ──────────────────────────────────────────────────────────────

async function _signTokens(user, orgId, role) {
  const { accessSecret, refreshSecret } = await secrets.getJwtSecrets();
  const payload = {
    sub: user.id,
    org: orgId || user.organization_id,
    role: role || user.role,
    type: 'access',
  };
  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: ACCESS_TTL,
    issuer: process.env.JWT_ISSUER || 'sync2b-safeguard',
    audience: process.env.JWT_AUDIENCE || 'sync2b-safeguard-api',
  });

  const rawRefresh = cryptoSvc.generateSecureToken(48);
  const refreshHash = cryptoSvc.hashToken(rawRefresh);
  const familyId = uuid();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000);

  return { accessToken, rawRefresh, refreshHash, familyId, expiresAt };
}

async function _verifyAccess(token) {
  const { accessSecret } = await secrets.getJwtSecrets();
  return jwt.verify(token, accessSecret, {
    issuer: process.env.JWT_ISSUER || 'sync2b-safeguard',
    audience: process.env.JWT_AUDIENCE || 'sync2b-safeguard-api',
  });
}

// ── Register ─────────────────────────────────────────────────────────────────

async function register({ orgName, orgSlug, email, password, firstName, lastName, ipAddress }) {
  return db.transaction(async (trx) => {
    const existing = await orgRepo.findBySlug(orgSlug, trx);
    if (existing) throw new ConflictError('Slug de organização já utilizado');

    const org = await orgRepo.create({ name: orgName, slug: orgSlug }, trx);

    const existingUser = await userRepo.findByEmail(email, org.id, trx);
    if (existingUser) throw new ConflictError('Email já cadastrado nesta organização');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const otpSecret = speakeasy.generateSecret({ name: `Sync2B Safeguard (${email})` });

    const user = await userRepo.create({
      organizationId: org.id,
      email,
      passwordHash,
      otpSecret: otpSecret.base32,
      role: 'org_admin',
      firstName,
      lastName,
    }, trx);

    // Populate junction table
    await trx.query(
      `INSERT INTO user_organizations (user_id, organization_id, role)
       VALUES ($1, $2, 'org_admin') ON CONFLICT DO NOTHING`,
      [user.id, org.id]
    );

    const qrCode = await qrcode.toDataURL(otpSecret.otpauth_url);

    await auditRepo.log({
      organizationId: org.id,
      userId: user.id,
      action: 'USER_REGISTERED',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
      metadata: { email, orgSlug },
    });

    return { user, org, qrCode, otpSecret: otpSecret.base32 };
  });
}

// ── Login step 1: email + password ───────────────────────────────────────────

async function loginStep1({ email, password, ipAddress, userAgent }) {
  // Tenta busca multi-org (requer migration 004); caso a tabela não exista, usa fluxo legado.
  let orgMemberships = [];
  try {
    orgMemberships = await userRepo.findOrgsByEmail(email);
  } catch (_) {
    // Tabela user_organizations ainda não criada — fallback para método legado
    orgMemberships = [];
  }

  if (orgMemberships.length === 0) {
    // Fluxo legado (organização única por usuário)
    const user = await userRepo.findByEmailAcrossOrgs(email);
    if (!user) throw new AuthenticationError('Credenciais inválidas');
    if (!user.org_active)  throw new ForbiddenError('Organização inativa');
    if (!user.is_active)   throw new ForbiddenError('Conta desativada');
    return _checkLockAndPassword(user, password, user.organization_id, user.role, ipAddress, userAgent);
  }

  const first = orgMemberships[0];

  if (first.locked_until && new Date(first.locked_until) > new Date()) {
    const wait = Math.ceil((new Date(first.locked_until) - Date.now()) / 60000);
    throw new AuthenticationError(`Conta bloqueada. Tente novamente em ${wait} minuto(s).`, 'ACCOUNT_LOCKED');
  }

  const valid = await bcrypt.compare(password, first.password_hash);
  if (!valid) {
    await userRepo.incrementFailedAttempts(first.user_id);
    await auditRepo.log({
      organizationId: first.organization_id,
      userId: first.user_id,
      action: 'LOGIN_FAILED',
      ipAddress,
      status: 'failure',
      metadata: { reason: 'invalid_password' },
    });
    throw new AuthenticationError('Credenciais inválidas');
  }

  await userRepo.resetFailedAttempts(first.user_id);
  const user = await userRepo.findById(first.user_id);

  // Múltiplas organizações → pede seleção
  if (orgMemberships.length > 1) {
    const { accessSecret } = await secrets.getJwtSecrets();
    const tempToken = jwt.sign(
      { sub: user.id, type: 'org_select' },
      accessSecret,
      { expiresIn: '5m' }
    );
    return {
      requiresOrgSelection: true,
      tempToken,
      organizations: orgMemberships.map(m => ({
        id: m.organization_id,
        name: m.org_name,
        slug: m.org_slug,
        role: m.role,
      })),
    };
  }

  // Organização única — continua fluxo normal
  return _proceedAfterPassword(user, first.organization_id, first.role, ipAddress, userAgent);
}

// ── Login step 1.5: selecionar organização ────────────────────────────────────

async function loginSelectOrg({ tempToken, organizationId, ipAddress, userAgent }) {
  const { accessSecret } = await secrets.getJwtSecrets();
  let decoded;
  try {
    decoded = jwt.verify(tempToken, accessSecret);
  } catch {
    throw new AuthenticationError('Token temporário inválido ou expirado');
  }
  if (decoded.type !== 'org_select') throw new AuthenticationError('Token inválido');

  const membership = await userRepo.findMembership(decoded.sub, organizationId);
  if (!membership || !membership.is_active) throw new ForbiddenError('Acesso negado a esta organização');

  const user = await userRepo.findById(decoded.sub);
  if (!user) throw new AuthenticationError('Usuário não encontrado');

  return _proceedAfterPassword(user, organizationId, membership.role, ipAddress, userAgent);
}

// ── Helpers internos ──────────────────────────────────────────────────────────

async function _checkLockAndPassword(user, password, orgId, role, ipAddress, userAgent) {
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const wait = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
    throw new AuthenticationError(`Conta bloqueada. Tente novamente em ${wait} minuto(s).`, 'ACCOUNT_LOCKED');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const result = await userRepo.incrementFailedAttempts(user.id);
    await auditRepo.log({
      organizationId: orgId,
      userId: user.id,
      action: 'LOGIN_FAILED',
      ipAddress,
      status: 'failure',
      metadata: { reason: 'invalid_password', attempts: result.failed_login_attempts },
    });
    throw new AuthenticationError('Credenciais inválidas');
  }

  await userRepo.resetFailedAttempts(user.id);
  return _proceedAfterPassword(user, orgId, role, ipAddress, userAgent);
}

async function _proceedAfterPassword(user, orgId, role, ipAddress, userAgent) {
  // 2FA não configurado → completa imediatamente
  if (!user.otp_enabled && !user.otp_secret) {
    const { accessToken, rawRefresh, refreshHash, familyId, expiresAt } = await _signTokens(user, orgId, role);
    await tokenRepo.createRefreshToken({
      userId: user.id, tokenHash: refreshHash, familyId, expiresAt, ipAddress, userAgent,
    });
    await auditRepo.log({
      organizationId: orgId,
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      ipAddress,
      metadata: { twoFactor: false, userAgent },
    });
    return { requiresTwoFactor: false, accessToken, refreshToken: rawRefresh, expiresIn: ACCESS_TTL };
  }

  // 2FA configurado → emite temp token para step 2
  const { accessSecret } = await secrets.getJwtSecrets();
  const tempToken = jwt.sign(
    { sub: user.id, org: orgId, role, type: 'temp' },
    accessSecret,
    { expiresIn: '5m' }
  );
  return { tempToken, requiresTwoFactor: true };
}

// ── Login step 2: TOTP verification ──────────────────────────────────────────

async function loginStep2({ tempToken, totpCode, ipAddress, userAgent }) {
  const { accessSecret } = await secrets.getJwtSecrets();
  let decoded;
  try {
    decoded = jwt.verify(tempToken, accessSecret);
  } catch {
    throw new AuthenticationError('Token temporário inválido ou expirado');
  }
  if (decoded.type !== 'temp') throw new AuthenticationError('Token inválido');

  const user = await userRepo.findById(decoded.sub);
  if (!user) throw new AuthenticationError('Usuário não encontrado');

  const window = parseInt(process.env.TOTP_WINDOW || '2', 10);
  const valid = speakeasy.totp.verify({
    secret: user.otp_secret,
    encoding: 'base32',
    token: totpCode,
    window,
  });
  if (!valid) {
    await auditRepo.log({
      organizationId: decoded.org || user.organization_id,
      userId: user.id,
      action: 'LOGIN_2FA_FAILED',
      ipAddress,
      status: 'failure',
      metadata: { reason: 'invalid_totp' },
    });
    throw new AuthenticationError('Código do Authenticator inválido');
  }

  await userRepo.resetFailedAttempts(user.id);

  const orgId = decoded.org || user.organization_id;
  const role  = decoded.role || user.role;
  const { accessToken, rawRefresh, refreshHash, familyId, expiresAt } = await _signTokens(user, orgId, role);
  await tokenRepo.createRefreshToken({ userId: user.id, tokenHash: refreshHash, familyId, expiresAt, ipAddress, userAgent });

  await auditRepo.log({
    organizationId: orgId,
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    ipAddress,
    metadata: { userAgent },
  });

  return { accessToken, refreshToken: rawRefresh, expiresIn: ACCESS_TTL };
}

// ── Refresh token rotation ────────────────────────────────────────────────────

async function refreshTokens({ rawRefreshToken, ipAddress, userAgent }) {
  const tokenHash = cryptoSvc.hashToken(rawRefreshToken);
  const stored = await tokenRepo.findRefreshToken(tokenHash);

  if (!stored) throw new AuthenticationError('Refresh token inválido', 'INVALID_REFRESH_TOKEN');
  if (stored.revoked_at) {
    await tokenRepo.revokeFamily(stored.family_id);
    throw new AuthenticationError('Token comprometido. Faça login novamente.', 'TOKEN_REUSE_DETECTED');
  }
  if (new Date(stored.expires_at) < new Date()) throw new AuthenticationError('Refresh token expirado');
  if (!stored.is_active || !stored.org_active) throw new ForbiddenError('Conta inativa');

  await tokenRepo.revokeToken(tokenHash);

  const user = await userRepo.findById(stored.user_id);
  const { accessToken, rawRefresh: newRaw, refreshHash: newHash, familyId: newFamily, expiresAt } = await _signTokens(user);
  await tokenRepo.createRefreshToken({ userId: user.id, tokenHash: newHash, familyId: stored.family_id, expiresAt, ipAddress, userAgent });

  return { accessToken, refreshToken: newRaw };
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function logout({ rawRefreshToken, userId, ipAddress }) {
  if (rawRefreshToken) {
    const hash = cryptoSvc.hashToken(rawRefreshToken);
    await tokenRepo.revokeToken(hash);
  }
  await auditRepo.log({
    userId,
    action: 'LOGOUT',
    ipAddress,
  });
}

// ── Verify access token ───────────────────────────────────────────────────────

async function verifyAccessToken(token) {
  return _verifyAccess(token);
}

// ── Forgot password ───────────────────────────────────────────────────────────

async function forgotPassword({ email, ipAddress }) {
  const user = await userRepo.findByEmailAcrossOrgs(email);
  if (!user) return;

  const rawToken = cryptoSvc.generateSecureToken(32);
  const tokenHash = cryptoSvc.hashToken(rawToken);
  const ttl = parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || '15', 10);
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

  await tokenRepo.createResetToken({ userId: user.id, tokenHash, expiresAt, ipAddress });
  await emailSvc.sendPasswordReset({ to: email, resetToken: rawToken, ipAddress });

  await auditRepo.log({
    organizationId: user.organization_id,
    userId: user.id,
    action: 'PASSWORD_RESET_REQUESTED',
    ipAddress,
  });
}

// ── Validate reset token ──────────────────────────────────────────────────────

async function validateResetToken(rawToken) {
  const tokenHash = cryptoSvc.hashToken(rawToken);
  const record = await tokenRepo.findValidResetToken(tokenHash);
  if (!record) throw new ValidationError('Link inválido ou expirado');
  return { email: record.email, valid: true };
}

// ── Reset password ────────────────────────────────────────────────────────────

async function resetPassword({ rawToken, totpCode, newPassword, ipAddress }) {
  const tokenHash = cryptoSvc.hashToken(rawToken);
  const record = await tokenRepo.findValidResetToken(tokenHash);
  if (!record) throw new ValidationError('Link inválido ou expirado');

  const window = parseInt(process.env.TOTP_WINDOW || '2', 10);
  const valid = speakeasy.totp.verify({
    secret: record.otp_secret,
    encoding: 'base32',
    token: totpCode,
    window,
  });
  if (!valid) throw new AuthenticationError('Código do Authenticator inválido');

  await db.transaction(async (trx) => {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await userRepo.updatePassword(record.user_id, passwordHash, trx);
    await tokenRepo.consumeResetToken(tokenHash, trx);
    await tokenRepo.revokeAllForUser(record.user_id, trx);
  });

  await auditRepo.log({
    organizationId: record.organization_id,
    userId: record.user_id,
    action: 'PASSWORD_RESET_COMPLETED',
    ipAddress,
  });
}

// ── Change password ───────────────────────────────────────────────────────────

async function changePassword({ userId, currentPassword, newPassword, ipAddress }) {
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('Usuário');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AuthenticationError('Senha atual incorreta');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.transaction(async (trx) => {
    await userRepo.updatePassword(userId, passwordHash, trx);
    await tokenRepo.revokeAllForUser(userId, trx);
  });

  await auditRepo.log({
    organizationId: user.organization_id,
    userId,
    action: 'PASSWORD_CHANGED',
    ipAddress,
  });
}

module.exports = {
  register, loginStep1, loginSelectOrg, loginStep2, refreshTokens, logout,
  verifyAccessToken, forgotPassword, validateResetToken, resetPassword, changePassword,
};
