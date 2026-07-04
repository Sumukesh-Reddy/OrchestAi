'use strict';

const BasePlugin = require('./BasePlugin');
const AxiosHttpClient = require('../../infrastructure/http/AxiosHttpClient');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('HttpRequestPlugin');
const httpClient = new AxiosHttpClient();

/**
 * HTTP_REQUEST plugin — makes outbound HTTP calls to downstream APIs.
 */
class HttpRequestPlugin extends BasePlugin {
  get type() {
    return 'HTTP_REQUEST';
  }

  /**
   * @param {object} config
   * @param {string} config.url - Target URL (may contain template expressions)
   * @param {string} config.method - HTTP method
   * @param {object} [config.headers] - Request headers
   * @param {any} [config.body] - Request body
   * @param {object} [config.params] - Query parameters
   * @param {number} [config.timeout] - Timeout in ms
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<object>}
   */
  async execute(config, context) {
    // Resolve all template expressions in config
    const resolved = this._resolveConfig(config, context);

    logger.debug('Executing HTTP_REQUEST', {
      method: resolved.method,
      url: resolved.url,
      executionId: context.metadata.executionId,
    });

    const response = await httpClient.request({
      method: resolved.method || 'GET',
      url: resolved.url,
      headers: resolved.headers || {},
      body: resolved.body,
      params: resolved.params || {},
      timeout: resolved.timeout || 10000,
    });

    const isSuccess = response.status >= 200 && response.status < 300;

    return {
      output: {
        status: response.status,
        data: response.data,
        headers: response.headers,
        duration: response.duration,
      },
      nodeStatus: isSuccess ? 'SUCCESS' : 'FAILED',
      error: response.error
        ? { message: response.error, code: response.errorCode }
        : isSuccess
        ? null
        : { message: `HTTP ${response.status}`, code: 'HTTP_ERROR', status: response.status },
    };
  }

  /**
   * Validate HTTP_REQUEST node configuration.
   * @param {object} config
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(config) {
    const errors = [];

    if (!config.url && !config.url?.includes('{{')) {
      if (!config.url) errors.push('url is required');
    }

    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    if (!config.method) {
      errors.push('method is required');
    } else if (!validMethods.includes(config.method.toUpperCase())) {
      errors.push(`method must be one of: ${validMethods.join(', ')}`);
    }

    if (config.timeout !== undefined && typeof config.timeout !== 'number') {
      errors.push('timeout must be a number (milliseconds)');
    }

    return { valid: errors.length === 0, errors };
  }
}

module.exports = HttpRequestPlugin;
