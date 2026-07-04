'use strict';

const jsonLogic = require('json-logic-js');
const BasePlugin = require('./BasePlugin');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('ConditionPlugin');

/**
 * CONDITION plugin — evaluates a JSONLogic expression to determine branching path.
 */
class ConditionPlugin extends BasePlugin {
  get type() {
    return 'CONDITION';
  }

  /**
   * @param {object} config
   * @param {object|string} config.expression - JSONLogic expression
   * @param {string} [config.trueTarget] - Node ID to route to when true
   * @param {string} [config.falseTarget] - Node ID to route to when false
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<object>}
   */
  async execute(config, context) {
    const { expression, trueTarget, falseTarget } = config;

    const contextData = {
      outputs: context.getOutputsSnapshot(),
      variables: context.variables,
      request: context.request,
      metadata: context.metadata,
    };

    let logic;
    try {
      logic = typeof expression === 'string' ? JSON.parse(expression) : expression;
    } catch (err) {
      return {
        output: { result: false, selectedTarget: falseTarget || null },
        nodeStatus: 'FAILED',
        error: { message: `Invalid JSONLogic expression: ${err.message}` },
      };
    }

    let result;
    try {
      result = Boolean(jsonLogic.apply(logic, contextData));
    } catch (err) {
      logger.warn('Condition evaluation error', { error: err.message });
      result = false;
    }

    const selectedTarget = result ? (trueTarget || null) : (falseTarget || null);

    logger.debug('Condition evaluated', {
      result,
      selectedTarget,
      executionId: context.metadata.executionId,
    });

    return {
      output: {
        result,
        selectedTarget,
        trueTarget: trueTarget || null,
        falseTarget: falseTarget || null,
      },
      nodeStatus: 'SUCCESS',
    };
  }

  validate(config) {
    const errors = [];
    if (config.expression === undefined || config.expression === null) {
      errors.push('expression is required');
    } else {
      try {
        const logic = typeof config.expression === 'string'
          ? JSON.parse(config.expression)
          : config.expression;
        jsonLogic.apply(logic, {});
      } catch (err) {
        errors.push(`Invalid JSONLogic expression: ${err.message}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = ConditionPlugin;
