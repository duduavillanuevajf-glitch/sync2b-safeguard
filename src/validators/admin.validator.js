'use strict';

const Joi = require('joi');

const createUser = Joi.object({
  email: Joi.string().email().lowercase().max(255).required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('org_admin', 'vault_manager', 'vault_viewer').required(),
  firstName: Joi.string().max(100).optional().allow('', null),
  lastName: Joi.string().max(100).optional().allow('', null),
  require2fa: Joi.boolean().optional(),
});

const updateUser = Joi.object({
  role: Joi.string().valid('org_admin', 'vault_manager', 'vault_viewer').optional(),
  firstName: Joi.string().max(100).optional().allow('', null),
  lastName: Joi.string().max(100).optional().allow('', null),
  isActive: Joi.boolean().optional(),
});

const updateOrg = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  alertDays: Joi.number().integer().min(1).max(3650).optional(),
  settings: Joi.object().optional(),
});

const listUsersQuery = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

module.exports = { createUser, updateUser, updateOrg, listUsersQuery };
