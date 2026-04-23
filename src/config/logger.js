'use strict';

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const transport = isDev
  ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
  : undefined;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport,
  base: { service: 'safeguard', version: process.env.npm_package_version || '2.0.0' },
  redact: {
    paths: ['password', 'password_hash', 'otp_secret', 'token', 'access_token', 'refresh_token', '*.password', '*.token'],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
