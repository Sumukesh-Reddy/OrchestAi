'use strict';

const BasePlugin = require('./BasePlugin');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('RetryPlugin');

/**
 * RETRY_WRAPPER plugin — wraps another node type with retry logic and exponential/fixed backoff.
 */
class RetryPlugin extends BasePlugin {
  get type() {
    return 'RETRY_WRAPPER';
  }

  /**
   * @param {object} config
   * @param {string} config.targetNodeId - ID of the node to retry on failure
   * @param {number} [config.maxAttempts=3]
   * @param {number} [config.delay=1000] - Initial delay in ms
   * @param {string} [config.backoffType='exponential'] - exponential | fixed
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<object>}
   */
  async execute(config, context) {
    const { targetNodeId, maxAttempts = 3, delay = 1000, backoffType = 'exponential' } = config;

    // Get the target node definition from workflow nodes
    const targetNode = context.workflowNodes.find((n) => n.id === targetNodeId);
    if (!targetNode) {
      return {
        output: null,
        nodeStatus: 'FAILED',
        error: { message: `Target node '${targetNodeId}' not found in workflow` },
      };
    }

    const { registry } = require('./PluginRegistry');
    let plugin;
    try {
      plugin = registry.get(targetNode.type);
    } catch (err) {
      return {
        output: null,
        nodeStatus: 'FAILED',
        error: { message: `No plugin for type '${targetNode.type}': ${err.message}` },
      };
    }

    let lastError = null;
    let lastResult = null;
    let retryCount = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const waitMs = backoffType === 'exponential'
          ? delay * Math.pow(2, attempt - 1)
          : delay;

        logger.info(`Retry attempt ${attempt + 1}/${maxAttempts}`, {
          targetNodeId,
          waitMs,
          executionId: context.metadata.executionId,
        });

        await this._sleep(waitMs);
        retryCount++;
      }

      try {
        lastResult = await plugin.execute(targetNode.config, context);

        // Consider the attempt successful if nodeStatus is SUCCESS
        if (!lastResult.error && lastResult.nodeStatus !== 'FAILED') {
          return {
            ...lastResult,
            retryCount,
            nodeStatus: 'SUCCESS',
          };
        }

        lastError = lastResult.error || { message: 'Node returned FAILED status' };
        logger.warn(`Retry attempt ${attempt + 1} failed`, {
          targetNodeId,
          error: lastError.message,
        });
      } catch (err) {
        lastError = { message: err.message };
        logger.warn(`Retry attempt ${attempt + 1} threw exception`, {
          targetNodeId,
          error: err.message,
        });
      }
    }

    return {
      output: lastResult?.output || null,
      nodeStatus: 'FAILED',
      retryCount,
      error: { message: `All ${maxAttempts} attempts failed. Last error: ${lastError?.message}`, lastError },
    };
  }

  /**
   * @param {number} ms
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  validate(config) {
    const errors = [];
    if (!config.targetNodeId) {
      errors.push('targetNodeId is required');
    }
    if (config.maxAttempts !== undefined && (typeof config.maxAttempts !== 'number' || config.maxAttempts < 1)) {
      errors.push('maxAttempts must be a positive number');
    }
    if (config.backoffType && !['exponential', 'fixed'].includes(config.backoffType)) {
      errors.push('backoffType must be exponential or fixed');
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = RetryPlugin;
