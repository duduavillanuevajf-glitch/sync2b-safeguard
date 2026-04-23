'use strict';

const { Pool } = require('pg');
const logger = require('./logger');

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
  application_name: 'safeguard-api',
};

const primaryPool = new Pool(poolConfig);

const readonlyPool = process.env.DATABASE_URL_READONLY
  ? new Pool({ ...poolConfig, connectionString: process.env.DATABASE_URL_READONLY })
  : primaryPool;

primaryPool.on('error', (err) => logger.error({ err }, 'Unexpected DB pool error'));

async function connect() {
  const client = await primaryPool.connect();
  await client.query('SELECT 1');
  client.release();
  logger.info('Database connection established');
}

async function end() {
  await primaryPool.end();
  if (readonlyPool !== primaryPool) await readonlyPool.end();
}

async function transaction(callback) {
  const client = await primaryPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  query: (text, params) => primaryPool.query(text, params),
  queryRead: (text, params) => readonlyPool.query(text, params),
  transaction,
  connect,
  end,
  pool: primaryPool,
};
