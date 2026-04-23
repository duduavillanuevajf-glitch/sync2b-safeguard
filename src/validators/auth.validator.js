'use strict';

const Joi = require('joi');

const email = Joi.string().email().lowercase().max(255).required();
const password = Joi.string().min(8).max(128).required();

const register = Joi.object({
  orgName: Joi.string().min(2).max(255).required().messages({ 'any.required': 'Nome da organização é obrigatório' }),
  orgSlug: Joi.string().lowercase().alphanum().min(2).max(100).required()
    .messages({ 'any.required': 'Slug da organização é obrigatório', 'string.alphanum': 'Slug deve conter apenas letras e números' }),
  email,
  password,
  firstName: Joi.string().max(100).optional().allow('', null),
  lastName: Joi.string().max(100).optional().allow('', null),
});

const login = Joi.object({
  email,
  password: Joi.string().required(),
});

const verifyTwoFactor = Joi.object({
  tempToken: Joi.string().required(),
  totpCode: Joi.string().length(6).pattern(/^\d{6}$/).required()
    .messages({ 'string.pattern.base': 'Código deve ter 6 dígitos numéricos' }),
});

const refreshToken = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPassword = Joi.object({ email });

const validateResetToken = Joi.object({
  token: Joi.string().required(),
});

const resetPassword = Joi.object({
  token: Joi.string().required(),
  totpCode: Joi.string().length(6).pattern(/^\d{6}$/).required(),
  newPassword: password.messages({ 'string.min': 'Nova senha deve ter pelo menos 8 caracteres' }),
});

const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: password.messages({ 'string.min': 'Nova senha deve ter pelo menos 8 caracteres' }),
});

module.exports = { register, login, verifyTwoFactor, refreshToken, forgotPassword, validateResetToken, resetPassword, changePassword };
