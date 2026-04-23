'use strict';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.ENCRYPTION_KEY_VERSION = '1';
process.env.BCRYPT_ROUNDS = '4';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://safeguard:secret@localhost:5432/safeguard_test';

jest.setTimeout(30000);
