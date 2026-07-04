'use strict';

const jsonLogic = require('json-logic-js');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('ConditionEvaluator');

/**
 * Evaluates edge conditions to determine whether a node should execute.
 */
class ConditionEvaluator {
  /**
   * Evaluate a condition against the current execution context.
   * @param {object} condition - { type: 'ALWAYS'|'EXPRESSION'|'STATUS', expression?: string }
   * @param {import('./ExecutionContext')} context
   * @returns {boolean} Whether the condition passes
   */
  evaluate(condition, context) {
    if (!condition || condition.type === 'ALWAYS' || !condition.type) {
      return true;
    }

    if (condition.type === 'EXPRESSION') {
      return this._evaluateExpression(condition.expression, context);
    }

    if (condition.type === 'STATUS') {
      return this._evaluateStatus(condition.expression, context);
    }

    logger.warn('Unknown condition type, defaulting to true', { type: condition.type });
    return true;
  }

  /**
   * Evaluate a JSONLogic expression.
   * @param {string|object} expression - JSONLogic object or JSON string
   * @param {import('./ExecutionContext')} context
   * @returns {boolean}
   * @private
   */
  _evaluateExpression(expression, context) {
    try {
      let logic;
      if (typeof expression === 'string') {
        logic = JSON.parse(expression);
      } else {
        logic = expression;
      }

      const contextData = {
        outputs: context.getOutputsSnapshot(),
        variables: context.variables,
        request: context.request,
        metadata: context.metadata,
      };

      const result = jsonLogic.apply(logic, contextData);
      return Boolean(result);
    } catch (err) {
      logger.warn('Condition expression evaluation failed, defaulting to false', {
        expression: String(expression).substring(0, 100),
        error: err.message,
      });
      return false;
    }
  }

  /**
   * Evaluate a simple status condition like "node_1.SUCCESS" or "node_1.status === SUCCESS".
   * Format: "<nodeId>.<expectedStatus>"
   * @param {string} expression
   * @param {import('./ExecutionContext')} context
   * @returns {boolean}
   * @private
   */
  _evaluateStatus(expression, context) {
    try {
      // Format: "nodeId.STATUS" e.g. "http_1.SUCCESS"
      const parts = expression.split('.');
      if (parts.length < 2) {
        logger.warn('Invalid STATUS condition format', { expression });
        return false;
      }

      const nodeId = parts[0];
      const expectedStatus = parts[1].toUpperCase();
      const nodeOutput = context.getOutput(nodeId);

      if (!nodeOutput) {
        logger.debug('Node output not found for STATUS condition', { nodeId, expectedStatus });
        return false;
      }

      return nodeOutput.status === expectedStatus || nodeOutput.nodeStatus === expectedStatus;
    } catch (err) {
      logger.warn('STATUS condition evaluation failed', { expression, error: err.message });
      return false;
    }
  }

  /**
   * Validate a JSONLogic expression without evaluating it.
   * @param {string|object} expression
   * @returns {{valid: boolean, error: string|null}}
   */
  static validateExpression(expression) {
    try {
      let logic;
      if (typeof expression === 'string') {
        logic = JSON.parse(expression);
      } else {
        logic = expression;
      }

      // Test with empty data to check if it's valid JSONLogic
      jsonLogic.apply(logic, {});
      return { valid: true, error: null };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}

module.exports = ConditionEvaluator;
