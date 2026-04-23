'use strict';

const Redis = require('ioredis');
const logger = require('./logger');

const isTLS = process.env.REDIS_TLS === 'true';

const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  tls: isTLS ? {} : undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  reconnectOnError: (err) => err.message.includes('READONLY'),
  enableOfflineQueue: true,
});

client.on('connect', () => logger.info('Redis connected'));
client.on('error', (err) => logger.error({ err }, 'Redis error'));
client.on('reconnecting', () => logger.warn('Redis reconnecting'));

async function ping() {
  const result = await client.ping();
  if (result !== 'PONG') throw new Error('Redis ping failed');
  logger.info('Redis connection verified');
}

async function quit() {
  await client.quit();
}

module.exports = { client, ping, quit };
