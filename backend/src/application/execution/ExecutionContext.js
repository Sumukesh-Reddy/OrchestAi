'use strict';

const { JSONPath } = require('jsonpath-plus');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('ExecutionContext');

/**
 * ExecutionContext holds all state for a single workflow execution.
 * It is passed through the engine and all plugins during execution.
 */
class ExecutionContext {
  /**
   * @param {object} options
   * @param {object} options.request - Incoming HTTP request data { body, query, params, headers }
   * @param {object} options.metadata - Execution metadata { executionId, workflowId, workflowVersion, correlationId, startTime }
   * @param {Array} [options.workflowNodes] - All nodes in the workflow (used by RetryPlugin)
   */
  constructor({ request, metadata, workflowNodes = [] }) {
    this.request = {
      body: request.body || {},
      query: request.query || {},
      params: request.params || {},
      headers: request.headers || {},
    };

    this.metadata = {
      executionId: metadata.executionId,
      workflowId: metadata.workflowId,
      workflowVersion: metadata.workflowVersion || null,
      correlationId: metadata.correlationId || null,
      startTime: metadata.startTime || new Date(),
    };

    this.workflowNodes = workflowNodes;

    /** @type {Map<string, {data: any, status: number, duration: number, error: any}>} */
    this._outputs = new Map();

    /** @type {object} */
    this.variables = {};

    /** @type {Array<object>} */
    this._nodeExecutionRecords = [];
  }

  /**
   * Store a node's output result.
   * @param {string} nodeId
   * @param {object} output - { data, status, duration, error }
   */
  setOutput(nodeId, output) {
    this._outputs.set(nodeId, output);
  }

  /**
   * Retrieve a node's output.
   * @param {string} nodeId
   * @returns {object|null}
   */
  getOutput(nodeId) {
    return this._outputs.get(nodeId) || null;
  }

  /**
   * Get a plain object snapshot of all outputs (for JSONPath evaluation).
   * @returns {object}
   */
  getOutputsSnapshot() {
    const snapshot = {};
    for (const [nodeId, output] of this._outputs.entries()) {
      snapshot[nodeId] = output;
    }
    return snapshot;
  }

  /**
   * Set a named variable in the execution context.
   * @param {string} key
   * @param {any} value
   */
  setVariable(key, value) {
    this.variables[key] = value;
  }

  /**
   * Get a named variable.
   * @param {string} key
   * @returns {any}
   */
  getVariable(key) {
    return this.variables[key];
  }

  /**
   * Resolve template strings/objects using current context values.
   * Replaces {{outputs.nodeId.data.field}}, {{request.body.field}}, {{variables.key}},
   * {{metadata.executionId}}, etc.
   *
   * @param {any} template - String, object, or array containing template expressions
   * @returns {any} Resolved value
   */
  resolveTemplate(template) {
    if (template === null || template === undefined) return template;

    if (typeof template === 'string') {
      return this._resolveString(template);
    }

    if (Array.isArray(template)) {
      return template.map((item) => this.resolveTemplate(item));
    }

    if (typeof template === 'object') {
      const resolved = {};
      for (const [key, value] of Object.entries(template)) {
        resolved[key] = this.resolveTemplate(value);
      }
      return resolved;
    }

    return template;
  }

  /**
   * Resolve a single template string.
   * @param {string} str
   * @returns {any}
   * @private
   */
  _resolveString(str) {
    // Check if the entire string is a single template expression
    const singleExprMatch = str.match(/^\{\{(.+?)\}\}$/);
    if (singleExprMatch) {
      return this._resolveExpression(singleExprMatch[1].trim());
    }

    // Replace all template expressions in the string
    return str.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
      const resolved = this._resolveExpression(expr.trim());
      if (resolved === null || resolved === undefined) return '';
      if (typeof resolved === 'object') return JSON.stringify(resolved);
      return String(resolved);
    });
  }

  /**
   * Resolve a single expression like 'outputs.nodeId.data.field' or 'request.body.userId'.
   * @param {string} expr
   * @returns {any}
   * @private
   */
  _resolveExpression(expr) {
    try {
      const contextData = this._buildContextData();
      // Use JSONPath to navigate the context
      const jsonPathExpr = expr.startsWith('$.') ? expr : `$.${expr}`;
      const results = JSONPath({ path: jsonPathExpr, json: contextData, wrap: false });

      if (results === null || results === undefined) {
        logger.debug('Template expression resolved to null', { expr });
        return null;
      }
      return results;
    } catch (err) {
      logger.warn('Template expression resolution failed', { expr, error: err.message });
      return null;
    }
  }

  /**
   * Build the full context data object for expression resolution.
   * @returns {object}
   * @private
   */
  _buildContextData() {
    return {
      request: this.request,
      outputs: this.getOutputsSnapshot(),
      variables: this.variables,
      metadata: this.metadata,
    };
  }

  /**
   * Record node execution data for the final execution log.
   * @param {object} record - Node execution record
   */
  recordNodeExecution(record) {
    this._nodeExecutionRecords.push(record);
  }

  /**
   * Get all recorded node execution data.
   * @returns {Array<object>}
   */
  getNodeExecutionRecords() {
    return [...this._nodeExecutionRecords];
  }

  /**
   * Serialize the context to a plain object for BullMQ job payloads.
   * @returns {object}
   */
  toSnapshot() {
    return {
      request: this.request,
      outputs: this.getOutputsSnapshot(),
      variables: this.variables,
      metadata: this.metadata,
    };
  }

  /**
   * Restore context state from a snapshot (used by BullMQ workers).
   * @param {object} snapshot
   */
  restoreFromSnapshot(snapshot) {
    if (snapshot.outputs) {
      for (const [nodeId, output] of Object.entries(snapshot.outputs)) {
        this._outputs.set(nodeId, output);
      }
    }
    if (snapshot.variables) {
      this.variables = { ...snapshot.variables };
    }
  }
}

module.exports = ExecutionContext;
