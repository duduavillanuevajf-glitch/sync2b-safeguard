'use strict';

const logger = require('../config/logger');

function startJobs() {
  if (process.env.JOBS_ENABLED === 'false') {
    logger.info('Background jobs disabled');
    return;
  }
  require('./expiry-alerts.job').schedule();
  require('./token-cleanup.job').schedule();
  logger.info('Background jobs started');
}

module.exports = { startJobs };
