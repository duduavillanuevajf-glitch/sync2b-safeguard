'use strict';

const { v4: uuid } = require('uuid');
const db = require('../config/database');

class TokenRepository {
  // ── Refresh tokens ──────────────────────────────────────────────────────────

  async createRefreshToken({ userId, tokenHash, familyId, expiresAt, ipAddress, userAgent }, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [uuid(), userId, tokenHash, familyId, expiresAt, ipAddress || null, userAgent || null]
    );
    return rows[0];
  }

  async findRefreshToken(tokenHash, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT rt.*, u.organization_id, u.role, u.is_active,
              o.is_active AS org_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       JOIN organizations o ON o.id = u.organization_id
       WHERE rt.token_hash = $1 LIMIT 1`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  async revokeToken(tokenHash, trx) {
    const client = trx || db;
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
      [tokenHash]
    );
  }

  async revokeFamily(familyId, trx) {
    const client = trx || db;
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1 AND revoked_at IS NULL`,
      [familyId]
    );
  }

  async revokeAllForUser(userId, trx) {
    const client = trx || db;
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  }

  async deleteExpired(trx) {
    const client = trx || db;
    const { rowCount } = await client.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW()`
    );
    return rowCount;
  }

  // ── Password reset tokens ───────────────────────────────────────────────────

  async createResetToken({ userId, tokenHash, expiresAt, ipAddress }, trx) {
    const client = trx || db;
    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );
    const { rows } = await client.query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, ip_address)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [uuid(), userId, tokenHash, expiresAt, ipAddress || null]
    );
    return rows[0];
  }

  async findValidResetToken(tokenHash, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT r.*, u.email, u.otp_secret, u.organization_id
       FROM password_reset_tokens r
       JOIN users u ON u.id = r.user_id
       WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  async consumeResetToken(tokenHash, trx) {
    const client = trx || db;
    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1`,
      [tokenHash]
    );
  }

  async deleteExpiredResetTokens(trx) {
    const client = trx || db;
    const { rowCount } = await client.query(
      `DELETE FROM password_reset_tokens WHERE expires_at < NOW()`
    );
    return rowCount;
  }
}

module.exports = new TokenRepository();
