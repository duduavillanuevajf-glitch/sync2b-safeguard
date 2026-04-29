'use strict';

const authService = require('../services/auth.service');
const userRepo = require('../repositories/user.repository');
const { success } = require('../utils/response');

function _ip(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

async function getProfile(req, res, next) {
  try {
    const user = await userRepo.findById(req.user.id);
    success(res, {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.is_active,
      totpEnabled: user.otp_enabled ?? false,
      organization: {
        id: user.organization_id,
        name: user.org_name,
        slug: user.org_slug,
        alertDays: user.org_alert_days,
      },
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    });
  } catch (err) { next(err); }
}

async function changePassword(req, res, next) {
  try {
    await authService.changePassword({
      userId: req.user.id,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
      ipAddress: _ip(req),
    });
    success(res, null, { message: 'Senha alterada com sucesso. Faça login novamente.' });
  } catch (err) { next(err); }
}

module.exports = { getProfile, changePassword };
