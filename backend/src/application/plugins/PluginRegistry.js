'use strict';

const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('PluginRegistry');

/**
 * Factory + Registry for workflow node plugins.
 * Plugins are registered by their type string and instantiated on demand.
 */
class PluginRegistry {
  constructor() {
    /** @type {Map<string, Function>} */
    this._registry = new Map();
  }

  /**
   * Register a plugin class by its type.
   * @param {string} type - Node type identifier (e.g. 'HTTP_REQUEST')
   * @param {Function} PluginClass - Class extending BasePlugin
   * @returns {PluginRegistry} this (for chaining)
   */
  register(type, PluginClass) {
    if (this._registry.has(type)) {
      logger.warn(`Plugin type '${type}' is being overridden`, { type });
    }
    this._registry.set(type, PluginClass);
    logger.debug(`Plugin registered: ${type}`, { type });
    return this;
  }

  /**
   * Get a new plugin instance by type.
   * @param {string} type
   * @returns {import('./BasePlugin')}
   * @throws {Error} If type is not registered
   */
  get(type) {
    const PluginClass = this._registry.get(type);
    if (!PluginClass) {
      throw new Error(
        `No plugin registered for node type '${type}'. ` +
          `Registered types: ${this.getRegistered().join(', ')}`
      );
    }
    return new PluginClass();
  }

  /**
   * Check if a type is registered.
   * @param {string} type
   * @returns {boolean}
   */
  isRegistered(type) {
    return this._registry.has(type);
  }

  /**
   * Get all registered type names.
   * @returns {string[]}
   */
  getRegistered() {
    return Array.from(this._registry.keys());
  }

  /**
   * Unregister a plugin type (mainly for testing).
   * @param {string} type
   */
  unregister(type) {
    this._registry.delete(type);
  }
}

// Singleton instance
const registry = new PluginRegistry();

// Auto-register all plugins
function registerAllPlugins() {
  const HttpRequestPlugin = require('./HttpRequestPlugin');
  const TransformPlugin = require('./TransformPlugin');
  const ConditionPlugin = require('./ConditionPlugin');
  const ParallelPlugin = require('./ParallelPlugin');
  const MergePlugin = require('./MergePlugin');
  const ResponseMapperPlugin = require('./ResponseMapperPlugin');
  const ValidatorPlugin = require('./ValidatorPlugin');
  const RetryPlugin = require('./RetryPlugin');
  const CachePlugin = require('./CachePlugin');
  const AiAgentPlugin = require('./AiAgentPlugin');
  const ReturnPlugin = require('./ReturnPlugin');

  registry
    .register('HTTP_REQUEST', HttpRequestPlugin)
    .register('TRANSFORM', TransformPlugin)
    .register('CONDITION', ConditionPlugin)
    .register('PARALLEL', ParallelPlugin)
    .register('MERGE', MergePlugin)
    .register('RESPONSE_MAPPER', ResponseMapperPlugin)
    .register('VALIDATOR', ValidatorPlugin)
    .register('RETRY_WRAPPER', RetryPlugin)
    .register('CACHE_CHECK', CachePlugin)
    .register('CACHE_WRITE', CachePlugin)
    .register('AI_AGENT', AiAgentPlugin)
    .register('RETURN', ReturnPlugin);

  logger.info('All plugins registered', { types: registry.getRegistered() });
}

module.exports = { PluginRegistry, registry, registerAllPlugins };
