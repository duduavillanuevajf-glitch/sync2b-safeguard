'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { client: redis } = require('../config/redis');
const { TooManyRequestsError } = require('../utils/errors');

function _handler(req, res, next) {
  next(new TooManyRequestsError());
}

function _store(prefix) {
  if (process.env.NODE_ENV === 'test') return undefined;
  try {
    return new RedisStore({
      sendCommand: async (...args) => {
        const [command, ...cmdArgs] = args;
        const fn = redis[command.toLowerCase()];
        if (typeof fn !== 'function') return 0;
        return fn.apply(redis, cmdArgs);
      },
      prefix: `rl:${prefix}:`,
    });
  } catch {
    return undefined;
  }
}

const global = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  store: _store('global'),
  handler: _handler,
  keyGenerator: (req) => req.ip,
  skip: (req) => process.env.NODE_ENV === 'test',
});

const auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  store: _store('auth'),
  handler: _handler,
  keyGenerator: (req) => `${req.ip}:${req.body?.email || ''}`,
  skip: (req) => process.env.NODE_ENV === 'test',
});

const importLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_IMPORT_MAX || '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
  store: _store('import'),
  handler: _handler,
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => process.env.NODE_ENV === 'test',
});

module.exports = { global, auth, importLimit };
