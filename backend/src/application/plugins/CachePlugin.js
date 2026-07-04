'use strict';

const BasePlugin = require('./BasePlugin');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('CachePlugin');

/**
 * CACHE_CHECK / CACHE_WRITE plugin — reads from or writes to the two-level cache.
 * The same class handles both operations; behavior determined by node.type.
 */
class CachePlugin extends BasePlugin {
  get type() {
    // This plugin handles both CACHE_CHECK and CACHE_WRITE
    // PluginRegistry registers it under both keys
    return 'CACHE_CHECK';
  }

  /**
   * @param {object} config
   * @param {string} config.keyTemplate - Cache key template with {{expressions}}
   * @param {number} [config.ttl=300] - TTL in seconds (for CACHE_WRITE)
   * @param {string} [config.operation='READ'] - READ or WRITE (derived from node.type in practice)
   * @param {string} [config.sourceNodeId] - For CACHE_WRITE: which node output to cache
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<object>}
   */
  async execute(config, context) {
    const { keyTemplate, ttl = 300, operation = 'READ', sourceNodeId } = config;

    // Resolve the cache key from template
    const cacheKey = context.resolveTemplate(keyTemplate);

    if (!cacheKey) {
      return {
        output: { hit: false, key: null },
        nodeStatus: 'FAILED',
        error: { message: 'Cache key template resolved to empty value' },
      };
    }

    // Get the cache adapter from the container
    const { getContainer } = require('../../config/container');
    const { cacheAdapter } = getContainer();

    if (operation === 'WRITE' || context.metadata.nodeType === 'CACHE_WRITE') {
      // Write the output of sourceNodeId to cache
      let dataToCache;
      if (sourceNodeId) {
        const sourceOutput = context.getOutput(sourceNodeId);
        dataToCache = sourceOutput ? sourceOutput.output || sourceOutput.data : null;
      } else {
        dataToCache = context.getOutputsSnapshot();
      }

      await cacheAdapter.set(cacheKey, dataToCache, ttl);

      logger.debug('Cache WRITE', { key: cacheKey, ttl });

      return {
        output: { written: true, key: cacheKey, ttl },
        nodeStatus: 'SUCCESS',
      };
    }

    // READ operation
    const cached = await cacheAdapter.getValue(cacheKey);
    const hit = cached !== null;

    logger.debug('Cache READ', { key: cacheKey, hit });

    return {
      output: { hit, data: cached, key: cacheKey },
      nodeStatus: 'SUCCESS',
      cacheHit: hit,
    };
  }

  validate(config) {
    const errors = [];
    if (!config.keyTemplate) {
      errors.push('keyTemplate is required');
    }
    if (config.ttl !== undefined && typeof config.ttl !== 'number') {
      errors.push('ttl must be a number (seconds)');
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = CachePlugin;
