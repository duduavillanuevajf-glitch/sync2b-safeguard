'use strict';

jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/repositories/organization.repository');
jest.mock('../../../src/repositories/token.repository');
jest.mock('../../../src/repositories/audit.repository');
jest.mock('../../../src/services/email.service');
jest.mock('../../../src/config/database', () => ({
  transaction: jest.fn(async (cb) => cb({})),
  query: jest.fn(),
}));

const authService = require('../../../src/services/auth.service');
const userRepo = require('../../../src/repositories/user.repository');
const orgRepo = require('../../../src/repositories/organization.repository');
const tokenRepo = require('../../../src/repositories/token.repository');

beforeEach(() => jest.clearAllMocks());

describe('AuthService.loginStep1', () => {
  const baseUser = {
    id: 'user-1',
    email: 'test@example.com',
    password_hash: null,
    organization_id: 'org-1',
    is_active: true,
    org_active: true,
    org_name: 'Test Org',
    otp_enabled: true,
    otp_secret: 'SECRET',
    locked_until: null,
    failed_login_attempts: 0,
  };

  beforeEach(async () => {
    const bcrypt = require('bcrypt');
    baseUser.password_hash = await bcrypt.hash('correct-password', 4);
    userRepo.findByEmailAcrossOrgs.mockResolvedValue(baseUser);
  });

  test('returns tempToken on valid credentials', async () => {
    const result = await authService.loginStep1({ email: 'test@example.com', password: 'correct-password' });
    expect(result).toHaveProperty('tempToken');
    expect(result).toHaveProperty('requiresTwoFactor', true);
  });

  test('throws AuthenticationError on wrong password', async () => {
    userRepo.incrementFailedAttempts.mockResolvedValue({ failed_login_attempts: 1 });
    await expect(
      authService.loginStep1({ email: 'test@example.com', password: 'wrong-password' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test('throws AuthenticationError when user not found', async () => {
    userRepo.findByEmailAcrossOrgs.mockResolvedValue(null);
    await expect(
      authService.loginStep1({ email: 'nobody@x.com', password: 'pass' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test('throws AuthenticationError when account is locked', async () => {
    userRepo.findByEmailAcrossOrgs.mockResolvedValue({
      ...baseUser,
      locked_until: new Date(Date.now() + 60000),
    });
    await expect(
      authService.loginStep1({ email: 'test@example.com', password: 'correct-password' })
    ).rejects.toMatchObject({ statusCode: 401, code: 'ACCOUNT_LOCKED' });
  });

  test('throws ForbiddenError when org is inactive', async () => {
    userRepo.findByEmailAcrossOrgs.mockResolvedValue({ ...baseUser, org_active: false });
    await expect(
      authService.loginStep1({ email: 'test@example.com', password: 'correct-password' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('AuthService.forgotPassword', () => {
  test('completes silently when email not found (prevents enumeration)', async () => {
    userRepo.findByEmailAcrossOrgs.mockResolvedValue(null);
    await expect(
      authService.forgotPassword({ email: 'nobody@example.com' })
    ).resolves.toBeUndefined();
  });

  test('creates reset token and sends email when user found', async () => {
    const emailSvc = require('../../../src/services/email.service');
    userRepo.findByEmailAcrossOrgs.mockResolvedValue({
      id: 'user-1', email: 'test@example.com', organization_id: 'org-1',
    });
    tokenRepo.createResetToken.mockResolvedValue({});
    emailSvc.sendPasswordReset.mockResolvedValue();

    await authService.forgotPassword({ email: 'test@example.com', ipAddress: '127.0.0.1' });

    expect(tokenRepo.createResetToken).toHaveBeenCalledTimes(1);
    expect(emailSvc.sendPasswordReset).toHaveBeenCalledTimes(1);
  });
});
