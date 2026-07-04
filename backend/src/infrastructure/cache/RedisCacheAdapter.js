'use strict';

const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('RedisCacheAdapter');

/**
 * Redis cache adapter implementing the ICachePort interface.
 * Handles JSON serialization/deserialization and error isolation.
 */
class RedisCacheAdapter {
  /**
   * @param {import('ioredis').Redis} redisClient
   */
  constructor(redisClient) {
    this.client = redisClient;
  }

  /**
   * Get a cached value by key.
   * @param {string} key
   * @returns {Promise<any|null>} Parsed value or null on miss/error
   */
  async get(key) {
    try {
      const raw = await this.client.get(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (err) {
      logger.warn('Redis GET error', { key, error: err.message });
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL.
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlSeconds]
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttlSeconds) {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (err) {
      logger.warn('Redis SET error', { key, error: err.message });
      return false;
    }
  }

  /**
   * Delete a key.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (err) {
      logger.warn('Redis DEL error', { key, error: err.message });
      return false;
    }
  }

  /**
   * Delete all keys matching a glob pattern using SCAN.
   * @param {string} pattern - Glob pattern e.g. 'user:*'
   * @returns {Promise<number>} Number of keys deleted
   */
  async deletePattern(pattern) {
    try {
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          // Remove the key prefix since ioredis adds it automatically
          const rawKeys = keys.map((k) => {
            const prefix = this.client.options.keyPrefix || '';
            return prefix ? k.replace(prefix, '') : k;
          });
          await this.client.del(...rawKeys);
          deletedCount += rawKeys.length;
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (err) {
      logger.warn('Redis SCAN/DEL pattern error', { pattern, error: err.message });
      return 0;
    }
  }

  /**
   * Check if a key exists.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (err) {
      logger.warn('Redis EXISTS error', { key, error: err.message });
      return false;
    }
  }

  /**
   * Get the remaining TTL of a key in seconds.
   * @param {string} key
   * @returns {Promise<number>} -2 if key doesn't exist, -1 if no TTL, otherwise seconds
   */
  async ttl(key) {
    try {
      return await this.client.ttl(key);
    } catch (err) {
      logger.warn('Redis TTL error', { key, error: err.message });
      return -2;
    }
  }

  /**
   * Increment a numeric value (for counters).
   * @param {string} key
   * @param {number} [by=1]
   * @returns {Promise<number>}
   */
  async increment(key, by = 1) {
    try {
      return await this.client.incrby(key, by);
    } catch (err) {
      logger.warn('Redis INCRBY error', { key, error: err.message });
      return 0;
    }
  }
}

module.exports = RedisCacheAdapter;
