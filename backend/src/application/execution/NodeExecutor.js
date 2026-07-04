'use strict';

const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('NodeExecutor');

/**
 * NodeExecutor delegates node execution to the correct plugin
 * and handles per-node error strategies.
 */
class NodeExecutor {
  /**
   * @param {{ get: Function }} pluginRegistry
   * @param {object} loggerInstance
   */
  constructor(pluginRegistry, loggerInstance) {
    this.registry = pluginRegistry;
    this.logger = loggerInstance || logger;
  }

  /**
   * Execute a single workflow node.
   * @param {object} node - Node definition { id, type, label, config, onError }
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<{output: any, nodeStatus: string, duration: number, error: any}>}
   */
  async execute(node, context) {
    const startTime = Date.now();

    this.logger.debug('Node execution starting', {
      nodeId: node.id,
      nodeType: node.type,
      executionId: context.metadata.executionId,
    });

    // Get plugin
    let plugin;
    try {
      plugin = this.registry.get(node.type);
    } catch (err) {
      const duration = Date.now() - startTime;
      this.logger.error('Plugin not found for node type', {
        nodeId: node.id,
        nodeType: node.type,
        error: err.message,
      });
      return { output: null, nodeStatus: 'FAILED', duration, error: { message: err.message, code: 'PLUGIN_NOT_FOUND' } };
    }

    // Validate config
    const validationResult = plugin.validate(node.config || {});
    if (!validationResult.valid) {
      const duration = Date.now() - startTime;
      this.logger.warn('Node config validation failed', {
        nodeId: node.id,
        nodeType: node.type,
        errors: validationResult.errors,
      });
      return {
        output: null,
        nodeStatus: 'FAILED',
        duration,
        error: { message: 'Node config invalid', code: 'CONFIG_VALIDATION_ERROR', details: validationResult.errors },
      };
    }

    // Execute with timeout
    const timeoutMs = node.executionTimeoutMs || 30000;
    let result;

    try {
      result = await Promise.race([
        plugin.execute(node.config || {}, context),
        this._timeout(timeoutMs, node.id),
      ]);
    } catch (err) {
      const duration = Date.now() - startTime;
      this.logger.error('Node execution error', {
        nodeId: node.id,
        nodeType: node.type,
        error: err.message,
        duration,
      });

      const strategy = node.onError?.strategy || 'STOP';
      if (strategy === 'STOP') {
        throw err;
      }

      return {
        output: null,
        nodeStatus: 'FAILED',
        duration,
        error: { message: err.message, stack: err.stack, code: err.code || 'EXECUTION_ERROR' },
      };
    }

    const duration = Date.now() - startTime;

    this.logger.debug('Node execution completed', {
      nodeId: node.id,
      nodeType: node.type,
      nodeStatus: result.nodeStatus,
      duration,
    });

    return {
      output: result.output,
      nodeStatus: result.nodeStatus || 'SUCCESS',
      duration,
      error: result.error || null,
      metadata: result.metadata || {},
      cacheHit: result.cacheHit || false,
      isFinalResponse: result.isFinalResponse || false,
      statusCode: result.statusCode || null,
    };
  }

  /**
   * Creates a promise that rejects after the specified timeout.
   * @param {number} ms
   * @param {string} nodeId
   * @returns {Promise<never>}
   * @private
   */
  _timeout(ms, nodeId) {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Node '${nodeId}' timed out after ${ms}ms`)),
        ms
      )
    );
  }
}

module.exports = NodeExecutor;
