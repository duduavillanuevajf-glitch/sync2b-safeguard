'use strict';

const cron = require('node-cron');
const tokenRepo = require('../repositories/token.repository');
const logger = require('../config/logger');

async function runTokenCleanup() {
  const start = Date.now();
  logger.info('Running token cleanup job');

  try {
    const [refreshDeleted, resetDeleted] = await Promise.all([
      tokenRepo.deleteExpired(),
      tokenRepo.deleteExpiredResetTokens(),
    ]);
    logger.info({
      refreshDeleted,
      resetDeleted,
      durationMs: Date.now() - start,
    }, 'Token cleanup complete');
  } catch (err) {
    logger.error({ err }, 'Token cleanup job failed');
  }
}

function schedule() {
  const expression = process.env.TOKEN_CLEANUP_CRON || '0 3 * * *';
  cron.schedule(expression, runTokenCleanup);
  logger.info({ expression }, 'Token cleanup job scheduled');
}

module.exports = { schedule, runTokenCleanup };
