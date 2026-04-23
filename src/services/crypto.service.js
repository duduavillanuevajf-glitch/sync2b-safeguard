'use strict';

const crypto = require('crypto');
const secrets = require('../config/secrets');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function _parseKey(hexKey) {
  const buf = Buffer.from(hexKey, 'hex');
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars), got ${buf.length}`);
  }
  return buf;
}

async function _getKey(version) {
  const { key, version: v } = await secrets.getEncryptionKey(version);
  return { keyBuf: _parseKey(key), version: v };
}

async function encrypt(plaintext) {
  const { keyBuf, version } = await _getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuf, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encryptedPassword: encrypted.toString('base64'),
    encryptionIv: iv.toString('base64'),
    encryptionTag: tag.toString('base64'),
    encryptionVersion: version,
  };
}

async function decrypt(encryptedPassword, encryptionIv, encryptionTag, encryptionVersion = '1') {
  const { keyBuf } = await _getKey(encryptionVersion);
  const encBuf = Buffer.from(encryptedPassword, 'base64');
  const iv = Buffer.from(encryptionIv, 'base64');
  const tag = Buffer.from(encryptionTag, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encBuf), decipher.final()]);
  return decrypted.toString('utf8');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { encrypt, decrypt, hashToken, generateSecureToken };
