'use strict';

const Joi = require('joi');

const vaultItem = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({ 'any.required': 'Nome é obrigatório' }),
  host: Joi.string().max(255).optional().allow('', null),
  dns: Joi.string().max(255).optional().allow('', null),
  port: Joi.number().integer().min(1).max(65535).optional().allow(null),
  service: Joi.string().max(100).optional().allow('', null),
  username: Joi.string().max(255).optional().allow('', null),
  password: Joi.string().max(1000).required().messages({ 'any.required': 'Senha é obrigatória' }),
  notes: Joi.string().max(5000).optional().allow('', null),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional().default([]),
  category: Joi.string().max(100).optional().allow('', null),
  expiresAt: Joi.date().iso().min('now').optional().allow(null),
});

const updateVaultItem = vaultItem.keys({
  password: Joi.string().max(1000).optional().allow('', null),
});

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  archived: Joi.string().valid('true', 'false').optional(),
  search: Joi.string().max(100).optional().allow(''),
  alertDays: Joi.number().integer().min(1).max(3650).optional(),
  sortBy: Joi.string().valid('created_at', 'updated_at', 'name', 'service').optional(),
  sortDir: Joi.string().valid('ASC', 'DESC').optional(),
});

const alertQuery = Joi.object({
  alertDays: Joi.number().integer().min(1).max(3650).optional(),
});

module.exports = { vaultItem, updateVaultItem, listQuery, alertQuery };
