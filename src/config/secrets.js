'use strict';

const logger = require('./logger');

let vaultClient = null;
let cachedSecrets = {};

async function initVault() {
  if (process.env.VAULT_ENABLED !== 'true') return false;

  try {
    const vault = require('node-vault');
    vaultClient = vault({
      endpoint: process.env.VAULT_ADDR || 'http://vault:8200',
      token: process.env.VAULT_TOKEN,
      namespace: process.env.VAULT_NAMESPACE || undefined,
    });
    await vaultClient.health();
    logger.info('HashiCorp Vault connected');
    return true;
  } catch (err) {
    logger.warn({ err }, 'Vault unavailable, falling back to environment variables');
    vaultClient = null;
    return false;
  }
}

async function getSecret(key) {
  if (cachedSecrets[key]) return cachedSecrets[key];

  if (vaultClient) {
    try {
      const mount = process.env.VAULT_KV_MOUNT || 'secret';
      const path = process.env.VAULT_KV_PATH || 'safeguard';
      const response = await vaultClient.read(`${mount}/data/${path}`);
      const data = response.data?.data || response.data || {};
      Object.assign(cachedSecrets, data);
      if (cachedSecrets[key]) return cachedSecrets[key];
    } catch (err) {
      logger.warn({ err, key }, 'Failed to read secret from Vault, using env fallback');
    }
  }

  return process.env[key];
}

async function getEncryptionKey(version = null) {
  const v = version || process.env.ENCRYPTION_KEY_VERSION || '1';
  const envKey = `ENCRYPTION_KEY_V${v}`;
  const key = await getSecret(envKey) || await getSecret('ENCRYPTION_KEY');
  if (!key) throw new Error('Encryption key not configured');
  return { key, version: v };
}

async function getJwtSecrets() {
  const [accessSecret, refreshSecret] = await Promise.all([
    getSecret('JWT_ACCESS_SECRET'),
    getSecret('JWT_REFRESH_SECRET'),
  ]);
  if (!accessSecret || !refreshSecret) throw new Error('JWT secrets not configured');
  return { accessSecret, refreshSecret };
}

function clearCache() {
  cachedSecrets = {};
}

module.exports = { initVault, getSecret, getEncryptionKey, getJwtSecrets, clearCache };
