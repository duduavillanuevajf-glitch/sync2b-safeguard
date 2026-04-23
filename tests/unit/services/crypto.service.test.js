'use strict';

const crypto = require('../../../src/services/crypto.service');

describe('CryptoService', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    process.env.VAULT_ENABLED = 'false';
  });

  describe('encrypt / decrypt', () => {
    test('encrypts and decrypts a plain password', async () => {
      const plain = 'SuperSecretPass@2024!';
      const enc = await crypto.encrypt(plain);

      expect(enc).toHaveProperty('encryptedPassword');
      expect(enc).toHaveProperty('encryptionIv');
      expect(enc).toHaveProperty('encryptionTag');
      expect(enc).toHaveProperty('encryptionVersion');
      expect(enc.encryptedPassword).not.toBe(plain);

      const decrypted = await crypto.decrypt(enc.encryptedPassword, enc.encryptionIv, enc.encryptionTag);
      expect(decrypted).toBe(plain);
    });

    test('each encryption produces a different ciphertext (unique IV)', async () => {
      const plain = 'same-password';
      const enc1 = await crypto.encrypt(plain);
      const enc2 = await crypto.encrypt(plain);
      expect(enc1.encryptedPassword).not.toBe(enc2.encryptedPassword);
      expect(enc1.encryptionIv).not.toBe(enc2.encryptionIv);
    });

    test('decryption fails with tampered ciphertext', async () => {
      const enc = await crypto.encrypt('my-password');
      const tampered = Buffer.from(enc.encryptedPassword, 'base64');
      tampered[0] ^= 0xff;
      await expect(
        crypto.decrypt(tampered.toString('base64'), enc.encryptionIv, enc.encryptionTag)
      ).rejects.toThrow();
    });

    test('encrypts empty string', async () => {
      const enc = await crypto.encrypt('');
      const dec = await crypto.decrypt(enc.encryptedPassword, enc.encryptionIv, enc.encryptionTag);
      expect(dec).toBe('');
    });

    test('encrypts unicode / special characters', async () => {
      const plain = 'Pässwörd!@#$%^&*()_+🔐';
      const enc = await crypto.encrypt(plain);
      const dec = await crypto.decrypt(enc.encryptedPassword, enc.encryptionIv, enc.encryptionTag);
      expect(dec).toBe(plain);
    });
  });

  describe('hashToken', () => {
    test('returns consistent sha256 hex', () => {
      const h1 = crypto.hashToken('abc');
      const h2 = crypto.hashToken('abc');
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
    });

    test('different inputs produce different hashes', () => {
      expect(crypto.hashToken('a')).not.toBe(crypto.hashToken('b'));
    });
  });

  describe('generateSecureToken', () => {
    test('generates a hex token of the correct length', () => {
      const t = crypto.generateSecureToken(32);
      expect(t).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(t)).toBe(true);
    });

    test('generates unique tokens', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => crypto.generateSecureToken()));
      expect(tokens.size).toBe(100);
    });
  });
});
