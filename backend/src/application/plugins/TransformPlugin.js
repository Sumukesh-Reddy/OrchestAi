'use strict';

const { JSONPath } = require('jsonpath-plus');
const BasePlugin = require('./BasePlugin');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('TransformPlugin');

/**
 * TRANSFORM plugin — applies JSONPath-based field mappings to reshape data.
 */
class TransformPlugin extends BasePlugin {
  get type() {
    return 'TRANSFORM';
  }

  /**
   * @param {object} config
   * @param {Array<{from: string, to: string, default?: any}>} config.mappings
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<object>}
   */
  async execute(config, context) {
    const { mappings = [] } = config;

    const contextData = {
      outputs: context.getOutputsSnapshot(),
      request: context.request,
      variables: context.variables,
      metadata: context.metadata,
    };

    const result = {};

    for (const mapping of mappings) {
      const { from, to, default: defaultValue } = mapping;

      if (!to) {
        logger.warn('Transform mapping missing "to" field, skipping', { from });
        continue;
      }

      try {
        // Resolve "from" expression
        let value;

        if (typeof from === 'string' && (from.startsWith('$') || from.startsWith('outputs') || from.startsWith('request') || from.startsWith('variables'))) {
          // JSONPath or context path
          const jsonPathExpr = from.startsWith('$') ? from : `$.${from}`;
          value = JSONPath({ path: jsonPathExpr, json: contextData, wrap: false });
        } else if (typeof from === 'string' && from.includes('{{')) {
          // Template expression
          value = context.resolveTemplate(from);
        } else {
          // Static value
          value = from;
        }

        // Apply default if value is null/undefined
        if (value === null || value === undefined) {
          value = defaultValue !== undefined ? defaultValue : null;
        }

        // Support nested "to" keys using dot notation
        this._setNestedValue(result, to, value);

        logger.debug('Transform mapping applied', { from, to, valueType: typeof value });
      } catch (err) {
        logger.warn('Transform mapping failed', { from, to, error: err.message });
        if (defaultValue !== undefined) {
          this._setNestedValue(result, to, defaultValue);
        }
      }
    }

    return {
      output: result,
      nodeStatus: 'SUCCESS',
    };
  }

  /**
   * Set a value at a nested path using dot notation.
   * @param {object} obj
   * @param {string} path - e.g. 'user.profile.name'
   * @param {any} value
   * @private
   */
  _setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  validate(config) {
    const errors = [];
    if (!config.mappings || !Array.isArray(config.mappings)) {
      errors.push('mappings must be an array');
    } else if (config.mappings.length === 0) {
      errors.push('mappings must have at least one entry');
    } else {
      config.mappings.forEach((m, i) => {
        if (!m.to) errors.push(`mappings[${i}].to is required`);
      });
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = TransformPlugin;
