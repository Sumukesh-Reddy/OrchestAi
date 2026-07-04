'use strict';

const BasePlugin = require('./BasePlugin');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('ReturnPlugin');

/**
 * RETURN plugin — terminates workflow execution and returns a specific node's output.
 */
class ReturnPlugin extends BasePlugin {
  get type() {
    return 'RETURN';
  }

  /**
   * @param {object} config
   * @param {string} config.sourceNodeId - The node whose output becomes the response
   * @param {number} [config.statusCode=200]
   * @param {any} [config.transform] - Optional static response override
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<object>}
   */
  async execute(config, context) {
    const { sourceNodeId, statusCode = 200, transform } = config;

    let responseData;

    if (transform) {
      responseData = context.resolveTemplate(transform);
    } else if (sourceNodeId) {
      const sourceOutput = context.getOutput(sourceNodeId);
      responseData = sourceOutput ? sourceOutput.data || sourceOutput : null;
    } else {
      // Return all outputs if no source specified
      responseData = context.getOutputsSnapshot();
    }

    logger.debug('Return node executed', {
      sourceNodeId,
      statusCode,
      executionId: context.metadata.executionId,
    });

    return {
      output: responseData,
      nodeStatus: 'SUCCESS',
      isFinalResponse: true,
      statusCode,
    };
  }

  validate(config) {
    const errors = [];
    if (config.statusCode !== undefined && typeof config.statusCode !== 'number') {
      errors.push('statusCode must be a number');
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = ReturnPlugin;
