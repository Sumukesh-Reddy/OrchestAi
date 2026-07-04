'use strict';

const axios = require('axios');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('AxiosHttpClient');

/**
 * HTTP client adapter wrapping Axios.
 * Always returns a normalized result object — never throws on HTTP errors.
 */
class AxiosHttpClient {
  /**
   * @param {object} [defaultOptions]
   * @param {number} [defaultOptions.timeout=10000]
   * @param {object} [defaultOptions.headers]
   */
  constructor(defaultOptions = {}) {
    this.defaultTimeout = defaultOptions.timeout || 10000;
    this.defaultHeaders = defaultOptions.headers || {};
  }

  /**
   * Execute an HTTP request.
   * @param {object} options
   * @param {string} options.method - HTTP method
   * @param {string} options.url - Full URL
   * @param {object} [options.headers] - Request headers
   * @param {any} [options.body] - Request body (for POST/PUT/PATCH)
   * @param {object} [options.params] - URL query parameters
   * @param {number} [options.timeout] - Timeout in ms
   * @param {boolean} [options.followRedirects=true]
   * @returns {Promise<{status: number, data: any, headers: object, duration: number, error: string|null}>}
   */
  async request({ method, url, headers = {}, body, params = {}, timeout, followRedirects = true }) {
    const startTime = Date.now();
    const requestTimeout = timeout || this.defaultTimeout;

    const config = {
      method: method.toLowerCase(),
      url,
      headers: { ...this.defaultHeaders, ...headers },
      params,
      timeout: requestTimeout,
      maxRedirects: followRedirects ? 5 : 0,
      validateStatus: null, // Don't throw on non-2xx
    };

    if (body !== undefined && body !== null) {
      if (typeof body === 'object') {
        config.data = body;
        if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
        }
      } else {
        config.data = body;
      }
    }

    logger.debug('HTTP request outgoing', {
      method: method.toUpperCase(),
      url,
      hasBody: body !== undefined,
      timeout: requestTimeout,
    });

    try {
      const response = await axios(config);
      const duration = Date.now() - startTime;

      logger.debug('HTTP response received', {
        method: method.toUpperCase(),
        url,
        status: response.status,
        duration,
      });

      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        duration,
        error: null,
      };
    } catch (err) {
      const duration = Date.now() - startTime;

      if (err.response) {
        // HTTP error (4xx/5xx) — Axios only throws if validateStatus not set
        // This shouldn't happen since we set validateStatus: null, but handle anyway
        logger.warn('HTTP request returned error status', {
          method: method.toUpperCase(),
          url,
          status: err.response.status,
          duration,
        });

        return {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers,
          duration,
          error: null,
        };
      }

      // Network error (timeout, DNS, connection refused)
      logger.error('HTTP request network error', {
        method: method.toUpperCase(),
        url,
        error: err.message,
        code: err.code,
        duration,
      });

      return {
        status: 0,
        data: null,
        headers: {},
        duration,
        error: err.message,
        errorCode: err.code || 'NETWORK_ERROR',
      };
    }
  }

  /**
   * Convenience method for GET requests.
   * @param {string} url
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async get(url, options = {}) {
    return this.request({ ...options, method: 'GET', url });
  }

  /**
   * Convenience method for POST requests.
   * @param {string} url
   * @param {any} body
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async post(url, body, options = {}) {
    return this.request({ ...options, method: 'POST', url, body });
  }
}

module.exports = AxiosHttpClient;
