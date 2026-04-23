'use strict';

const logger = require('../config/logger');
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  const requestId = res.locals.requestId || req.requestId;

  if (err.isOperational) {
    logger.warn({
      err: { message: err.message, code: err.code, status: err.statusCode },
      requestId,
      path: req.path,
      method: req.method,
    }, 'Operational error');

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
      requestId,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'AUTHENTICATION_ERROR', message: 'Token inválido ou expirado' },
      requestId,
    });
  }

  // Joi validation that slipped through
  if (err.name === 'ValidationError' && err.isJoi) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message },
      requestId,
    });
  }

  // PostgreSQL constraint violations
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'Registro já existe' },
      requestId,
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Referência inválida' },
      requestId,
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'Arquivo muito grande. Máximo: 5MB' },
      requestId,
    });
  }

  logger.error({
    err: { message: err.message, stack: err.stack, name: err.name },
    requestId,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    orgId: req.user?.organizationId,
  }, 'Unhandled error');

  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Erro interno do servidor' : err.message,
      ...(isProd ? {} : { stack: err.stack }),
    },
    requestId,
  });
}

module.exports = errorHandler;
