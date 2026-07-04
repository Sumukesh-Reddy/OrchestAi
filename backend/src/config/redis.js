'use strict';

const Redis = require('ioredis');
const config = require('./env');
const { createLogger } = require('../infrastructure/logger/WinstonLogger');

const logger = createLogger('redis');

/** @type {Redis | null} */
let redisClient = null;

/**
 * Creates and returns the ioredis client with retry strategy and event logging.
 * @returns {Redis}
 */
function createRedisClient() {
  if (redisClient) return redisClient;

  redisClient = new Redis(config.redis.url, {
    keyPrefix: config.redis.keyPrefix,
    maxRetriesPerRequest: 3,
    connectTimeout: config.redis.connectTimeout,
    lazyConnect: false,
    retryStrategy(times) {
      if (times > config.redis.maxRetries) {
        logger.error('Redis max retry attempts reached. Giving up.', { attempts: times });
        return null; // stop retrying
      }
      const delay = Math.min(config.redis.retryDelayMs * Math.pow(2, times - 1), 30000);
      logger.warn(`Redis connection retry in ${delay}ms`, { attempt: times });
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ENOTFOUND'];
      if (targetErrors.some((e) => err.message.includes(e))) {
        logger.warn('Redis reconnect triggered due to error', { error: err.message });
        return true;
      }
      return false;
    },
  });

  redisClient.on('connect', () => {
    logger.info('Redis connecting...');
  });

  redisClient.on('ready', () => {
    logger.info('Redis connection ready', { url: config.redis.url });
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redisClient.on('reconnecting', (ms) => {
    logger.info(`Redis reconnecting in ${ms}ms`);
  });

  redisClient.on('end', () => {
    logger.warn('Redis connection ended');
    redisClient = null;
  });

  return redisClient;
}

/**
 * Returns the shared Redis client instance, creating it if needed.
 * @returns {Redis}
 */
function getRedisClient() {
  if (!redisClient) {
    return createRedisClient();
  }
  return redisClient;
}

/**
 * Returns a duplicate Redis connection (for BullMQ which needs its own connection).
 * @returns {Redis}
 */
function createDedicatedConnection() {
  return new Redis(config.redis.url, {
    maxRetriesPerRequest: null, // required by BullMQ
    connectTimeout: config.redis.connectTimeout,
    retryStrategy(times) {
      if (times > config.redis.maxRetries) return null;
      return Math.min(config.redis.retryDelayMs * Math.pow(2, times - 1), 30000);
    },
  });
}

/**
 * Checks if Redis is reachable.
 * @returns {Promise<boolean>}
 */
async function isRedisConnected() {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Gracefully disconnects the Redis client.
 * @returns {Promise<void>}
 */
async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected gracefully');
  }
}

// Initialize client on module load
createRedisClient();

module.exports = { getRedisClient, createDedicatedConnection, isRedisConnected, disconnectRedis };
