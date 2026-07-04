'use strict';

const NodeCache = require('node-cache');
const config = require('../../config/env');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('NodeCacheAdapter');

/**
 * In-memory NodeCache adapter implementing ICachePort.
 * Used as L1 cache before falling through to Redis.
 */
class NodeCacheAdapter {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: config.cache.defaultTtl,
      checkperiod: config.cache.nodeCacheCheckPeriod,
      useClones: false, // Avoid cloning overhead
      deleteOnExpire: true,
    });
  }

  /**
   * Get a cached value.
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      const value = this.cache.get(key);
      return value !== undefined ? value : null;
    } catch (err) {
      logger.warn('NodeCache GET error', { key, error: err.message });
      return null;
    }
  }

  /**
   * Set a value with optional TTL.
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlSeconds]
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttlSeconds) {
    try {
      if (ttlSeconds !== undefined) {
        this.cache.set(key, value, ttlSeconds);
      } else {
        this.cache.set(key, value);
      }
      return true;
    } catch (err) {
      logger.warn('NodeCache SET error', { key, error: err.message });
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
      this.cache.del(key);
      return true;
    } catch (err) {
      logger.warn('NodeCache DEL error', { key, error: err.message });
      return false;
    }
  }

  /**
   * Delete all keys matching a regex pattern.
   * @param {string} pattern - Glob or regex-compatible pattern
   * @returns {Promise<number>} Number of keys deleted
   */
  async deletePattern(pattern) {
    try {
      // Convert glob pattern to regex
      const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`);

      const keys = this.cache.keys().filter((k) => regex.test(k));
      if (keys.length > 0) {
        this.cache.del(keys);
      }
      return keys.length;
    } catch (err) {
      logger.warn('NodeCache pattern DEL error', { pattern, error: err.message });
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
      return this.cache.has(key);
    } catch (err) {
      logger.warn('NodeCache EXISTS error', { key, error: err.message });
      return false;
    }
  }

  /**
   * Get cache statistics.
   * @returns {object}
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Flush all entries from cache.
   */
  flush() {
    this.cache.flushAll();
  }
}

module.exports = NodeCacheAdapter;
