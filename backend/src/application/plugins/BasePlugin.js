'use strict';

/**
 * Abstract base plugin class.
 * All workflow node plugins must extend this class.
 */
class BasePlugin {
  /**
   * The unique type identifier for this plugin.
   * Must match node.type values in the workflow definition.
   * @returns {string}
   */
  get type() {
    throw new Error(`Plugin ${this.constructor.name} must implement the 'type' getter`);
  }

  /**
   * Execute the plugin with the given node config and execution context.
   * @param {object} config - Node-specific configuration object
   * @param {import('../execution/ExecutionContext')} context - Current execution context
   * @returns {Promise<{output: any, metadata?: object}>}
   */
  async execute(config, context) {
    throw new Error(`Plugin ${this.constructor.name} must implement execute()`);
  }

  /**
   * Validate the node configuration. Called before execution.
   * @param {object} config - Node configuration to validate
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(config) {
    throw new Error(`Plugin ${this.constructor.name} must implement validate()`);
  }

  /**
   * Resolve all template expressions in a config object using the execution context.
   * @param {object} config
   * @param {import('../execution/ExecutionContext')} context
   * @returns {object} Resolved config
   * @protected
   */
  _resolveConfig(config, context) {
    return context.resolveTemplate(config);
  }

  /**
   * Helper to build a standardized success output.
   * @param {any} data
   * @param {object} [meta]
   * @returns {object}
   * @protected
   */
  _success(data, meta = {}) {
    return { output: data, nodeStatus: 'SUCCESS', ...meta };
  }

  /**
   * Helper to build a standardized failure output.
   * @param {string} message
   * @param {any} [details]
   * @returns {object}
   * @protected
   */
  _failure(message, details = null) {
    return { output: null, nodeStatus: 'FAILED', error: { message, details } };
  }
}

module.exports = BasePlugin;
