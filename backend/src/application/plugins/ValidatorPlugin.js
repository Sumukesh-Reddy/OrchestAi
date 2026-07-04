'use strict';

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const BasePlugin = require('./BasePlugin');
const { ValidationError } = require('../../domain/errors/AppError');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('ValidatorPlugin');

// Shared AJV instance
const ajv = new Ajv({ allErrors: true, coerceTypes: true, removeAdditional: false });
addFormats(ajv);

/**
 * VALIDATOR plugin — validates data against a JSON Schema using AJV.
 */
class ValidatorPlugin extends BasePlugin {
  get type() {
    return 'VALIDATOR';
  }

  /**
   * @param {object} config
   * @param {object} config.schema - JSON Schema to validate against
   * @param {string} [config.inputPath='request.body'] - Context path to data to validate
   * @param {string} [config.onFail='STOP'] - STOP or CONTINUE on failure
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<object>}
   */
  async execute(config, context) {
    const { schema, inputPath = 'request.body', onFail = 'STOP' } = config;

    // Resolve the data to validate from context
    let dataToValidate;
    try {
      dataToValidate = context.resolveTemplate(`{{${inputPath}}}`);
    } catch (err) {
      dataToValidate = context.request.body;
    }

    let validate;
    try {
      validate = ajv.compile(schema);
    } catch (err) {
      return {
        output: { valid: false, errors: [{ message: `Invalid schema: ${err.message}` }] },
        nodeStatus: 'FAILED',
        error: { message: `Invalid JSON Schema: ${err.message}` },
      };
    }

    const valid = validate(dataToValidate);
    const fieldErrors = valid
      ? []
      : validate.errors.map((e) => ({
          field: e.instancePath || e.params?.missingProperty || 'root',
          message: e.message,
          value: e.data,
        }));

    logger.debug('Validation result', {
      valid,
      errorCount: fieldErrors.length,
      inputPath,
      executionId: context.metadata.executionId,
    });

    if (!valid && onFail === 'STOP') {
      throw new ValidationError('Request validation failed', fieldErrors);
    }

    return {
      output: { valid, errors: fieldErrors, data: dataToValidate },
      nodeStatus: valid ? 'SUCCESS' : 'FAILED',
      error: !valid ? { message: 'Validation failed', fieldErrors } : null,
    };
  }

  validate(config) {
    const errors = [];
    if (!config.schema || typeof config.schema !== 'object') {
      errors.push('schema must be a JSON Schema object');
    }
    if (config.onFail && !['STOP', 'CONTINUE'].includes(config.onFail)) {
      errors.push('onFail must be STOP or CONTINUE');
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = ValidatorPlugin;
