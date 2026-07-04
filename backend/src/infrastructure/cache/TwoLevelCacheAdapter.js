'use strict';

const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('TwoLevelCacheAdapter');

/**
 * Two-level cache adapter combining NodeCache (L1) and Redis (L2).
 *
 * Read path:  L1 → L2 → miss
 * Write path: L1 + L2 simultaneously
 * Delete path: L1 + L2 simultaneously
 *
 * L1 has a shorter effective TTL (min of requested TTL and 30s) to avoid stale L1 data.
 */
class TwoLevelCacheAdapter {
  /**
   * @param {import('./RedisCacheAdapter')} redisAdapter
   * @param {import('./NodeCacheAdapter')} nodeCacheAdapter
   * @param {object} [options]
   * @param {number} [options.l1MaxTtl=30] - Max TTL for L1 cache in seconds
   */
  constructor(redisAdapter, nodeCacheAdapter, options = {}) {
    this.l1 = nodeCacheAdapter;
    this.l2 = redisAdapter;
    this.l1MaxTtl = options.l1MaxTtl || 30;
  }

  /**
   * Get a value: check L1 first, then L2, populate L1 on L2 hit.
   * @param {string} key
   * @returns {Promise<{value: any, level: string}|null>}
   */
  async get(key) {
    // L1 check
    const l1Value = await this.l1.get(key);
    if (l1Value !== null) {
      logger.debug('Cache L1 HIT', { key });
      return { value: l1Value, level: 'L1' };
    }

    // L2 check
    const l2Value = await this.l2.get(key);
    if (l2Value !== null) {
      logger.debug('Cache L2 HIT', { key });
      // Populate L1 with a short TTL to avoid holding stale data
      await this.l1.set(key, l2Value, this.l1MaxTtl);
      return { value: l2Value, level: 'L2' };
    }

    logger.debug('Cache MISS', { key });
    return null;
  }

  /**
   * Get the raw value (without metadata).
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async getValue(key) {
    const result = await this.get(key);
    return result ? result.value : null;
  }

  /**
   * Set value in both L1 and L2.
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlSeconds]
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttlSeconds) {
    const l1Ttl = ttlSeconds ? Math.min(ttlSeconds, this.l1MaxTtl) : this.l1MaxTtl;

    const [l1Result, l2Result] = await Promise.allSettled([
      this.l1.set(key, value, l1Ttl),
      this.l2.set(key, value, ttlSeconds),
    ]);

    const l2Success = l2Result.status === 'fulfilled' && l2Result.value;
    if (!l2Success) {
      logger.warn('Failed to write to L2 cache', { key });
    }

    return l2Success;
  }

  /**
   * Delete from both L1 and L2.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    await Promise.allSettled([this.l1.delete(key), this.l2.delete(key)]);
    return true;
  }

  /**
   * Delete matching keys from both L1 and L2.
   * @param {string} pattern
   * @returns {Promise<number>}
   */
  async deletePattern(pattern) {
    const [l1Count, l2Count] = await Promise.allSettled([
      this.l1.deletePattern(pattern),
      this.l2.deletePattern(pattern),
    ]);

    return Math.max(
      l1Count.status === 'fulfilled' ? l1Count.value : 0,
      l2Count.status === 'fulfilled' ? l2Count.value : 0
    );
  }

  /**
   * Check existence in L1 first, then L2.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    const l1Exists = await this.l1.exists(key);
    if (l1Exists) return true;
    return this.l2.exists(key);
  }
}

module.exports = TwoLevelCacheAdapter;
