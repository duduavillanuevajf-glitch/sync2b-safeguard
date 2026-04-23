'use strict';

const authService = require('../services/auth.service');
const { success, created } = require('../utils/response');

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
    const result = await authService.loginStep1({ ...req.body, ipAddress: _ip(req) });
    success(res, result, { message: 'Senha válida. Insira o código do Google Authenticator.' });
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

module.exports = {
  register, login, verifyTwoFactor, refreshToken, logout,
  forgotPassword, validateResetToken, resetPassword,
};
