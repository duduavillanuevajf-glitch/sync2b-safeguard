'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../src/config/database');
const logger = require('../src/config/logger');

const SEED_EMAIL    = (process.env.SEED_ADMIN_EMAIL    || 'eduardo@sync2b.com').toLowerCase();
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD  || 'Sync2B@2026';
const SEED_ORG_SLUG = process.env.SEED_ORG_SLUG        || 'sync2b';
const SEED_ORG_NAME = process.env.SEED_ORG_NAME        || 'Sync2B';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

async function _clearRateLimit(email) {
  try {
    const { client: redis } = require('../src/config/redis');
    if (redis.status !== 'ready') return;
    const pattern = `rl:auth:*:${email}`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info({ count: keys.length }, 'Seed: rate limit do admin liberado');
    }
  } catch {
    // Redis opcional — falha silenciosa
  }
}

async function seedAdminUser() {
  try {
    // Garante que a org existe e está ativa
    const orgRes = await db.query(
      `INSERT INTO organizations (id, name, slug, plan, max_users, max_vault_items)
       VALUES ($1, $2, $3, 'enterprise', 9999, 999999)
       ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name, is_active = TRUE
       RETURNING id`,
      [uuid(), SEED_ORG_NAME, SEED_ORG_SLUG],
    );
    const orgId = orgRes.rows[0].id;

    // Procura o usuário em qualquer org (lida com volumes reutilizados)
    const anyUser = await db.query(
      `SELECT u.id, u.organization_id
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = $1
       LIMIT 1`,
      [SEED_EMAIL],
    );

    // Sempre gera um hash novo para garantir consistência
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);

    if (anyUser.rows.length > 0 && anyUser.rows[0].organization_id !== orgId) {
      // Usuário em org diferente: mover para org correta
      await db.query(
        `UPDATE users
         SET organization_id = $1, password_hash = $2,
             failed_login_attempts = 0, locked_until = NULL,
             role = 'super_admin', otp_secret = NULL, otp_enabled = FALSE,
             is_active = TRUE
         WHERE id = $3`,
        [orgId, passwordHash, anyUser.rows[0].id],
      );
      logger.info({ email: SEED_EMAIL, orgId }, 'Seed: admin movido e senha corrigida');
      await _clearRateLimit(SEED_EMAIL);
      return;
    }

    const existing = await db.query(
      `SELECT id FROM users WHERE email = $1 AND organization_id = $2`,
      [SEED_EMAIL, orgId],
    );

    if (existing.rows.length === 0) {
      // Criar do zero
      await db.query(
        `INSERT INTO users
           (id, organization_id, email, password_hash, otp_secret, otp_enabled, role, first_name, last_name)
         VALUES ($1, $2, $3, $4, NULL, FALSE, 'super_admin', 'Eduardo', 'Admin')`,
        [uuid(), orgId, SEED_EMAIL, passwordHash],
      );
      logger.info({ email: SEED_EMAIL }, 'Seed: admin criado');
    } else {
      // Sempre atualiza hash + limpa bloqueios + garante super_admin
      await db.query(
        `UPDATE users
         SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL,
             role = 'super_admin', otp_secret = NULL, otp_enabled = FALSE, is_active = TRUE
         WHERE id = $2`,
        [passwordHash, existing.rows[0].id],
      );
      logger.info({ email: SEED_EMAIL }, 'Seed: admin atualizado (hash + bloqueios resetados)');
    }

    await _clearRateLimit(SEED_EMAIL);
  } catch (err) {
    logger.error({ err }, 'Seed: falha ao criar admin (servidor continua)');
  }
}

module.exports = { seedAdminUser };

if (require.main === module) {
  db.connect()
    .then(() => seedAdminUser())
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
}
