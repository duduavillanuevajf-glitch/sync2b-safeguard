'use strict';

require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuid } = require('uuid');
const db = require('../src/config/database');
const logger = require('../src/config/logger');

const SEED_EMAIL    = (process.env.SEED_ADMIN_EMAIL    || 'eduardo@sync2b.com').toLowerCase();
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD  || 'Sync2B@2026';
const SEED_ORG_SLUG = process.env.SEED_ORG_SLUG        || 'sync2b';
const SEED_ORG_NAME = process.env.SEED_ORG_NAME        || 'Sync2B';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

async function seedAdminUser() {
  try {
    // Ensure org exists (idempotent via ON CONFLICT)
    const orgRes = await db.query(
      `INSERT INTO organizations (id, name, slug, plan, max_users, max_vault_items)
       VALUES ($1, $2, $3, 'enterprise', 9999, 999999)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [uuid(), SEED_ORG_NAME, SEED_ORG_SLUG],
    );
    const orgId = orgRes.rows[0].id;

    // Check for existing user
    const existing = await db.query(
      `SELECT id, password_hash FROM users WHERE email = $1 AND organization_id = $2`,
      [SEED_EMAIL, orgId],
    );

    if (existing.rows.length === 0) {
      const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);
      await db.query(
        `INSERT INTO users
           (id, organization_id, email, password_hash, otp_secret, otp_enabled, role, first_name, last_name)
         VALUES ($1, $2, $3, $4, NULL, FALSE, 'super_admin', 'Eduardo', 'Admin')`,
        [uuid(), orgId, SEED_EMAIL, passwordHash],
      );
      logger.info({ email: SEED_EMAIL }, 'Seed: admin criado');
      return;
    }

    // User exists — verify password hash and fix if stale/wrong
    const valid = await bcrypt.compare(SEED_PASSWORD, existing.rows[0].password_hash);
    if (!valid) {
      const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);
      await db.query(
        `UPDATE users
         SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL,
             role = 'super_admin', otp_secret = NULL, otp_enabled = FALSE, is_active = TRUE
         WHERE id = $2`,
        [passwordHash, existing.rows[0].id],
      );
      logger.info({ email: SEED_EMAIL }, 'Seed: hash do admin corrigido');
    } else {
      // Ensure role/otp state are correct even if hash is fine
      await db.query(
        `UPDATE users
         SET failed_login_attempts = 0, locked_until = NULL, role = 'super_admin', is_active = TRUE
         WHERE id = $1`,
        [existing.rows[0].id],
      );
      logger.info({ email: SEED_EMAIL }, 'Seed: admin OK');
    }
  } catch (err) {
    logger.error({ err }, 'Seed: falha ao criar admin (servidor continua)');
  }
}

module.exports = { seedAdminUser };

// Allow running directly: node scripts/seed.js
if (require.main === module) {
  db.connect()
    .then(() => seedAdminUser())
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
}
