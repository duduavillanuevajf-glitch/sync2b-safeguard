'use strict';

class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Autenticação inválida', code = 'AUTHENTICATION_ERROR') {
    super(message, 401, code);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message, code = 'CONFLICT') {
    super(message, 409, code);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Muitas tentativas. Tente novamente mais tarde.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class UnprocessableError extends AppError {
  constructor(message, details = null) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }
}

class InternalError extends AppError {
  constructor(message = 'Erro interno do servidor') {
    super(message, 500, 'INTERNAL_ERROR');
    this.isOperational = false;
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  UnprocessableError,
  InternalError,
};
