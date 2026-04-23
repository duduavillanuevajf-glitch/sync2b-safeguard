'use strict';

require('dotenv').config();
const http = require('http');

const app = require('./app');
const db = require('./src/config/database');
const redis = require('./src/config/redis');
const secrets = require('./src/config/secrets');
const { startJobs } = require('./src/jobs');
const logger = require('./src/config/logger');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  logger.info({ env: process.env.NODE_ENV }, 'Starting Sync2B Safeguard...');

  await secrets.initVault();
  await db.connect();
  await redis.client.connect().catch(() => logger.warn('Redis not available, running without cache'));

  const server = http.createServer(app);

  server.listen(PORT, HOST, () => {
    logger.info({ port: PORT, host: HOST }, 'Sync2B Safeguard API ready');
  });

  startJobs();

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutdown signal received');
    server.close(async () => {
      await db.end();
      await redis.quit().catch(() => {});
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });
    setTimeout(() => { logger.error('Forced shutdown'); process.exit(1); }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
