'use strict';

/**
 * Reset forçado do admin — roda dentro do container:
 *   docker exec safeguard-api node scripts/reset-admin.js
 *
 * Não depende do logger. Usa console.log direto.
 * Garante que eduardo@sync2b.com existe, está ativo e a senha bate.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const EMAIL    = (process.env.SEED_ADMIN_EMAIL   || 'eduardo@sync2b.com').toLowerCase();
const PASSWORD = process.env.SEED_ADMIN_PASSWORD  || 'Sync2B@2026';
const ORG_SLUG = process.env.SEED_ORG_SLUG        || 'sync2b';
const ORG_NAME = process.env.SEED_ORG_NAME        || 'Sync2B';
const ROUNDS   = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('=== reset-admin: início ===');

    // 1. Estado atual
    const before = await client.query(
      `SELECT u.id, u.email, u.is_active, u.otp_enabled, u.failed_login_attempts,
              u.locked_until, u.role, o.slug, o.is_active AS org_active,
              LEFT(u.password_hash, 30) AS hash_preview
       FROM users u JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = $1 LIMIT 5`,
      [EMAIL],
    );

    if (before.rows.length === 0) {
      console.log(`Usuário ${EMAIL} NÃO EXISTE no banco.`);
    } else {
      console.log('Estado atual do usuário:');
      console.table(before.rows);
    }

    // 2. Garantir organização ativa
    await client.query(
      `INSERT INTO organizations (id, name, slug, plan, max_users, max_vault_items)
       VALUES (gen_random_uuid(), $1, $2, 'enterprise', 9999, 999999)
       ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name, is_active = TRUE`,
      [ORG_NAME, ORG_SLUG],
    );

    const orgRes = await client.query(
      `SELECT id FROM organizations WHERE slug = $1`, [ORG_SLUG],
    );
    const orgId = orgRes.rows[0].id;
    console.log(`Org "${ORG_SLUG}" id: ${orgId}`);

    // 3. Criar hash novo
    console.log(`Gerando hash bcrypt (rounds=${ROUNDS})...`);
    const passwordHash = await bcrypt.hash(PASSWORD, ROUNDS);

    // 4. Verificar que o hash gerado é válido
    const hashOk = await bcrypt.compare(PASSWORD, passwordHash);
    if (!hashOk) throw new Error('Hash gerado falhou na verificação — problema com bcryptjs');
    console.log('Hash verificado com sucesso.');

    // 5. Upsert do usuário — garantia total
    await client.query(
      `INSERT INTO users
         (id, organization_id, email, password_hash, otp_secret, otp_enabled,
          role, first_name, last_name, is_active, failed_login_attempts, locked_until)
       VALUES (gen_random_uuid(), $1, $2, $3, NULL, FALSE, 'super_admin', 'Eduardo', 'Admin', TRUE, 0, NULL)
       ON CONFLICT (organization_id, email) DO UPDATE
         SET password_hash         = EXCLUDED.password_hash,
             otp_secret            = NULL,
             otp_enabled           = FALSE,
             role                  = 'super_admin',
             is_active             = TRUE,
             failed_login_attempts = 0,
             locked_until          = NULL`,
      [orgId, EMAIL, passwordHash],
    );
    console.log('Usuário admin criado/atualizado.');

    // 6. Verificar resultado final
    const after = await client.query(
      `SELECT u.id, u.email, u.is_active, u.otp_enabled, u.failed_login_attempts,
              u.locked_until, u.role, o.is_active AS org_active
       FROM users u JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = $1`,
      [EMAIL],
    );
    console.log('Estado final:');
    console.table(after.rows);

    // 7. Simular bcrypt.compare como o auth service faz
    const finalHash = (await client.query(
      `SELECT password_hash FROM users WHERE email = $1 AND organization_id = $2`,
      [EMAIL, orgId],
    )).rows[0]?.password_hash;

    const loginOk = await bcrypt.compare(PASSWORD, finalHash);
    console.log(`\nbcrypt.compare("${PASSWORD}", hash_do_banco) = ${loginOk}`);

    if (loginOk) {
      console.log('\n✓ Admin pronto. Login deve funcionar agora.');
    } else {
      console.error('\n✗ Hash no banco ainda inválido. Investigue manualmente.');
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
