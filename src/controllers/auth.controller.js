'use strict';

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const authService = require('../services/auth.service');
const userRepo = require('../repositories/user.repository');
const { success, created } = require('../utils/response');
const { AuthenticationError } = require('../utils/errors');

function _ip(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

async function register(req, res, next) {
  try {
    const result = await authService.register({ ...req.body, ipAddress: _ip(req) });
    created(res, {
      user: { id: result.user.id, email: result.user.email, role: result.user.role },
      organization: { id: result.org.id, name: result.org.name, slug: result.org.slug },
      setup: { qrCode: result.qrCode, otpSecret: result.otpSecret },
    }, 'Organização e conta criadas com sucesso. Escaneie o QR Code no Google Authenticator.');
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const result = await authService.loginStep1({ ...req.body, ipAddress: _ip(req), userAgent: req.headers['user-agent'] });
    success(res, result, { message: 'Senha válida. Insira o código do Google Authenticator.' });
  } catch (err) { next(err); }
}

async function selectOrganization(req, res, next) {
  try {
    const result = await authService.loginSelectOrg({
      tempToken: req.body.tempToken,
      organizationId: req.body.organizationId,
      ipAddress: _ip(req),
      userAgent: req.headers['user-agent'],
    });
    success(res, result, { message: result.requiresTwoFactor ? 'Insira o código 2FA.' : 'Autenticação completa.' });
  } catch (err) { next(err); }
}

async function verifyTwoFactor(req, res, next) {
  try {
    const result = await authService.loginStep2({
      tempToken: req.body.tempToken,
      totpCode: req.body.totpCode,
      ipAddress: _ip(req),
      userAgent: req.headers['user-agent'],
    });
    success(res, result, { message: 'Autenticação completa' });
  } catch (err) { next(err); }
}

async function refreshToken(req, res, next) {
  try {
    const result = await authService.refreshTokens({
      rawRefreshToken: req.body.refreshToken,
      ipAddress: _ip(req),
      userAgent: req.headers['user-agent'],
    });
    success(res, result);
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    await authService.logout({
      rawRefreshToken: req.body.refreshToken || null,
      userId: req.user?.id,
      ipAddress: _ip(req),
    });
    success(res, null, { message: 'Logout realizado com sucesso' });
  } catch (err) { next(err); }
}

async function forgotPassword(req, res, next) {
  try {
    await authService.forgotPassword({ email: req.body.email, ipAddress: _ip(req) });
    success(res, null, { message: 'Se o email existir, você receberá as instruções.' });
  } catch (err) { next(err); }
}

async function validateResetToken(req, res, next) {
  try {
    const result = await authService.validateResetToken(req.query.token);
    success(res, result);
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword({ ...req.body, rawToken: req.body.token, ipAddress: _ip(req) });
    success(res, null, { message: 'Senha redefinida com sucesso!' });
  } catch (err) { next(err); }
}

async function setupTwoFactor(req, res, next) {
  try {
    const otpSecret = speakeasy.generateSecret({
      name: `Sync2B Safeguard (${req.user.email})`,
      length: 20,
    });
    const qr = await qrcode.toDataURL(otpSecret.otpauth_url);
    success(res, { qr, secret: otpSecret.base32 });
  } catch (err) { next(err); }
}

async function confirmTwoFactor(req, res, next) {
  try {
    const { code, secret } = req.body;
    const window = parseInt(process.env.TOTP_WINDOW || '2', 10);
    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window });
    if (!valid) throw new AuthenticationError('Código inválido');
    await userRepo.updateOtp(req.user.id, secret);
    success(res, null, { message: '2FA ativado com sucesso' });
  } catch (err) { next(err); }
}

module.exports = {
  register, login, selectOrganization, verifyTwoFactor, refreshToken, logout,
  forgotPassword, validateResetToken, resetPassword,
  setupTwoFactor, confirmTwoFactor,
};
