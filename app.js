'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const pinoHttp = require('pino-http');

const logger = require('./src/config/logger');
const requestId = require('./src/middlewares/requestId.middleware');
const rateLimiter = require('./src/middlewares/rateLimiter.middleware');
const errorHandler = require('./src/middlewares/errorHandler.middleware');
const routes = require('./src/routes');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
// CORS_ORIGINS: lista separada por vírgula de origens permitidas.
// Suporta múltiplos ambientes: http://192.168.x.x, https://app.empresa.com, etc.
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Sem header Origin = requisição server-to-server ou same-origin — permitir.
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Rejeitar sem lançar erro (cb com Error → Express error handler → 500).
    // cb(null, false) simplesmente omite os headers CORS; o browser bloqueia no lado cliente.
    logger.warn({ origin, allowedOrigins }, 'CORS: origin blocked');
    cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
}));

// ── Request tracking ──────────────────────────────────────────────────────────
app.use(requestId);

// ── Structured HTTP logging ───────────────────────────────────────────────────
app.use(pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  redact: { paths: ['req.headers.authorization'], censor: '[REDACTED]' },
  genReqId: (req) => req.requestId,
  autoLogging: { ignore: (req) => req.url === '/healthz' },
}));

// ── Body parsing & compression ────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── Global rate limiting ──────────────────────────────────────────────────────
app.use(rateLimiter.global);

// ── Trust proxy (for correct IP behind load balancer) ────────────────────────
app.set('trust proxy', 1);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/healthz', async (req, res) => {
  try {
    const db = require('./src/config/database');
    await db.query('SELECT 1');
    res.json({ status: 'ok', service: 'safeguard', ts: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', service: 'safeguard', reason: err.message });
  }
});

// ── API routes ────────────────────────────────────────────────────────────────
const apiVersion = process.env.API_VERSION || 'v2';
app.use(`/api/${apiVersion}`, routes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Rota não encontrada: ${req.method} ${req.path}` },
  });
});

// ── Centralised error handler ─────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
