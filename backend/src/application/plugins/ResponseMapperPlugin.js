'use strict';

const BasePlugin = require('./BasePlugin');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('ResponseMapperPlugin');

/**
 * RESPONSE_MAPPER plugin — shapes the final API response using a template object.
 */
class ResponseMapperPlugin extends BasePlugin {
  get type() {
    return 'RESPONSE_MAPPER';
  }

  /**
   * @param {object} config
   * @param {object} config.template - Template object with {{expression}} values
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<object>}
   */
  async execute(config, context) {
    const { template } = config;

    const resolved = context.resolveTemplate(template);

    logger.debug('Response mapped', {
      templateKeys: Object.keys(template || {}),
      executionId: context.metadata.executionId,
    });

    return {
      output: resolved,
      nodeStatus: 'SUCCESS',
    };
  }

  validate(config) {
    const errors = [];
    if (!config.template || typeof config.template !== 'object') {
      errors.push('template must be an object');
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = ResponseMapperPlugin;
