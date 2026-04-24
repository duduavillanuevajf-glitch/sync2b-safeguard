'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const migrationsDir = path.join(__dirname, '../migrations');

async function runMigrations(connectionString) {
  const pool = new Pool({ connectionString: connectionString || process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL       PRIMARY KEY,
        name       VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const applied = (await client.query('SELECT name FROM _migrations')).rows.map(r => r.name);
    for (const file of files) {
      if (applied.includes(file)) continue;
      console.log(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ✓ ${file}`);
    }
    console.log('All migrations applied.');
  } finally {
    client.release();
    await pool.end();
  }
}

async function rollbackLast(connectionString) {
  const pool = new Pool({ connectionString: connectionString || process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const last = (await client.query('SELECT name FROM _migrations ORDER BY id DESC LIMIT 1')).rows[0];
    if (!last) return console.log('Nothing to roll back.');
    console.log(`Rolling back: ${last.name}`);
    await client.query('DELETE FROM _migrations WHERE name = $1', [last.name]);
    console.log('  ✓ Rolled back (SQL-only rollback; manual schema revert may be needed)');
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { runMigrations };

if (require.main === module) {
  const direction = process.argv[2] || 'up';
  const fn = direction === 'up' ? runMigrations : rollbackLast;
  fn().catch(err => { console.error(err); process.exit(1); });
}
