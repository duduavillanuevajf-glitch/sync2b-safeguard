'use strict';

const { v4: uuid } = require('uuid');
const db = require('../config/database');
const BaseRepository = require('./base.repository');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async create({ organizationId, email, passwordHash, otpSecret, role = 'vault_viewer', firstName, lastName }, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `INSERT INTO users (id, organization_id, email, password_hash, otp_secret, otp_enabled, role, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7, $8)
       RETURNING id, organization_id, email, role, first_name, last_name, otp_enabled, is_active, created_at`,
      [uuid(), organizationId, email.toLowerCase(), passwordHash, otpSecret, role, firstName || null, lastName || null]
    );
    return rows[0];
  }

  async findByEmail(email, organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT * FROM users WHERE email = $1 AND organization_id = $2 LIMIT 1`,
      [email.toLowerCase(), organizationId]
    );
    return rows[0] || null;
  }

  async findByEmailAcrossOrgs(email, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT u.*, o.name AS org_name, o.slug AS org_slug, o.is_active AS org_active
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = $1 AND u.is_active = TRUE AND o.is_active = TRUE
       LIMIT 1`,
      [email.toLowerCase()]
    );
    return rows[0] || null;
  }

  async findById(id, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT u.id, u.organization_id, u.email, u.role, u.first_name, u.last_name,
              u.otp_enabled, u.otp_secret, u.is_active, u.last_login_at,
              u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
              o.name AS org_name, o.slug AS org_slug, o.alert_days AS org_alert_days,
              o.is_active AS org_active, o.settings AS org_settings
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async listByOrganization(organizationId, { limit, offset }, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT id, email, role, first_name, last_name, is_active, last_login_at, created_at
       FROM users WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset]
    );
    return rows;
  }

  async countByOrganization(organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT COUNT(*) AS count FROM users WHERE organization_id = $1`,
      [organizationId]
    );
    return parseInt(rows[0].count, 10);
  }

  async updatePassword(id, passwordHash, trx) {
    const client = trx || db;
    await client.query(
      `UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2`,
      [passwordHash, id]
    );
  }

  async incrementFailedAttempts(id, trx) {
    const client = trx || db;
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
    const lockoutMinutes = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10);
    const { rows } = await client.query(
      `UPDATE users
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE
             WHEN failed_login_attempts + 1 >= $2 THEN NOW() + ($3 || ' minutes')::INTERVAL
             ELSE locked_until
           END
       WHERE id = $1
       RETURNING failed_login_attempts, locked_until`,
      [id, maxAttempts, lockoutMinutes]
    );
    return rows[0];
  }

  async resetFailedAttempts(id, trx) {
    const client = trx || db;
    await client.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  async updateOtp(id, otpSecret, trx) {
    const client = trx || db;
    await client.query(
      `UPDATE users SET otp_secret = $1, otp_enabled = TRUE WHERE id = $2`,
      [otpSecret, id]
    );
  }

  async update(id, organizationId, fields, trx) {
    const client = trx || db;
    const allowed = ['role', 'first_name', 'last_name', 'is_active'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));
    if (!keys.length) return null;
    const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
    const { rows } = await client.query(
      `UPDATE users SET ${sets}
       WHERE id = $1 AND organization_id = $2
       RETURNING id, organization_id, email, role, first_name, last_name, is_active, created_at`,
      [id, organizationId, ...keys.map(k => fields[k])]
    );
    return rows[0] || null;
  }
}

module.exports = new UserRepository();
