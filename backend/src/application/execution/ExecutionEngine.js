'use strict';

const { v4: uuidv4 } = require('uuid');
const ExecutionContext = require('./ExecutionContext');
const DagBuilder = require('./DagBuilder');
const NodeExecutor = require('./NodeExecutor');
const ConditionEvaluator = require('./ConditionEvaluator');
const { WorkflowExecutionError } = require('../../domain/errors/AppError');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('ExecutionEngine');

/**
 * The core workflow execution engine.
 * Walks the workflow DAG node by node, delegating to plugins via NodeExecutor.
 */
class ExecutionEngine {
  /**
   * @param {object} deps
   * @param {{ get: Function, getRegistered: Function }} deps.pluginRegistry
   * @param {object} [deps.logger]
   */
  constructor({ pluginRegistry, logger: loggerInstance } = {}) {
    this.registry = pluginRegistry;
    this.logger = loggerInstance || logger;
    this.dagBuilder = new DagBuilder();
    this.conditionEvaluator = new ConditionEvaluator();
    this.nodeExecutor = new NodeExecutor(pluginRegistry, this.logger);
  }

  /**
   * Execute a workflow and return the result.
   *
   * @param {object} workflowVersion - { nodes, edges } from the workflow version
   * @param {object} request - Incoming request { body, query, params, headers }
   * @param {object} [options]
   * @param {string} [options.executionId]
   * @param {string} [options.correlationId]
   * @param {string} [options.workflowId]
   * @param {number} [options.workflowVersion]
   * @param {number} [options.timeoutMs=30000]
   * @returns {Promise<{
   *   executionId: string,
   *   status: string,
   *   duration: number,
   *   output: any,
   *   nodeExecutions: Array,
   *   error: any
   * }>}
   */
  async execute(workflowVersion, request, options = {}) {
    const {
      executionId = uuidv4(),
      correlationId = uuidv4(),
      workflowId = null,
      workflowVersion: version = null,
      timeoutMs = 30000,
    } = options;

    const { nodes = [], edges = [] } = workflowVersion;
    const startTime = Date.now();

    this.logger.info('Workflow execution starting', {
      executionId,
      workflowId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });

    // Validate DAG
    const dagValidation = this.dagBuilder.validate(nodes, edges);
    if (!dagValidation.valid) {
      const err = { message: 'Invalid workflow DAG', errors: dagValidation.errors };
      return {
        executionId,
        status: 'FAILED',
        duration: 0,
        output: null,
        nodeExecutions: [],
        error: err,
      };
    }

    // Create execution context
    const context = new ExecutionContext({
      request,
      metadata: { executionId, workflowId, workflowVersion: version, correlationId, startTime: new Date() },
      workflowNodes: nodes,
    });

    // Build DAG structures
    const dag = this.dagBuilder.build(nodes, edges);
    let sortedNodeIds;
    try {
      sortedNodeIds = this.dagBuilder.topologicalSort(nodes, edges);
    } catch (err) {
      return {
        executionId,
        status: 'FAILED',
        duration: Date.now() - startTime,
        output: null,
        nodeExecutions: [],
        error: { message: err.message },
      };
    }

    const nodeMap = {};
    for (const node of nodes) nodeMap[node.id] = node;

    const skippedNodes = new Set();
    let finalOutput = null;
    let finalStatusCode = 200;
    let overallStatus = 'SUCCESS';
    let executionError = null;

    // Execute nodes in topological order
    for (const nodeId of sortedNodeIds) {
      const node = nodeMap[nodeId];
      if (!node) continue;

      // Check if this node should be skipped
      if (skippedNodes.has(nodeId)) {
        context.recordNodeExecution({
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: node.label || node.type,
          status: 'SKIPPED',
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          input: null,
          output: null,
          error: null,
          retryCount: 0,
        });
        continue;
      }

      // Evaluate incoming edge conditions
      const predecessors = this.dagBuilder.getPredecessors(nodeId, dag);
      let shouldExecute = true;

      if (predecessors.length > 0) {
        // Check all incoming edges
        const incomingEdges = edges.filter((e) => e.target === nodeId);
        const conditionResults = incomingEdges.map((edge) => {
          const condition = edge.condition || { type: 'ALWAYS' };
          return this.conditionEvaluator.evaluate(condition, context);
        });

        // Node executes if ANY incoming condition passes (OR semantics for multi-input)
        // For single input, it must pass
        shouldExecute = conditionResults.length === 0 || conditionResults.some(Boolean);
      }

      if (!shouldExecute) {
        this.logger.debug('Node skipped due to condition', { nodeId, executionId });
        skippedNodes.add(nodeId);
        context.recordNodeExecution({
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: node.label || node.type,
          status: 'SKIPPED',
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          input: null,
          output: null,
          error: null,
          retryCount: 0,
        });
        continue;
      }

      // Execute the node
      const nodeStartTime = new Date();
      const execResult = await this.nodeExecutor.execute(node, context);
      const nodeEndTime = new Date();

      // Store output in context
      context.setOutput(nodeId, {
        data: execResult.output,
        nodeStatus: execResult.nodeStatus,
        error: execResult.error,
        duration: execResult.duration,
      });

      // Record for execution log
      context.recordNodeExecution({
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.label || node.type,
        status: execResult.nodeStatus,
        startTime: nodeStartTime,
        endTime: nodeEndTime,
        duration: execResult.duration,
        input: node.config,
        output: execResult.output,
        error: execResult.error,
        retryCount: execResult.retryCount || 0,
      });

      // Track final response from RETURN/RESPONSE_MAPPER nodes
      if (execResult.isFinalResponse || node.type === 'RETURN' || node.type === 'RESPONSE_MAPPER') {
        finalOutput = execResult.output;
        finalStatusCode = execResult.statusCode || 200;
      }

      // Handle node failure based on onError strategy
      if (execResult.nodeStatus === 'FAILED') {
        const strategy = node.onError?.strategy || 'STOP';

        if (strategy === 'STOP') {
          overallStatus = 'FAILED';
          executionError = execResult.error;
          this.logger.error('Node failed with STOP strategy, halting workflow', {
            nodeId,
            error: execResult.error,
            executionId,
          });
          // Mark remaining nodes as skipped
          const remainingNodes = sortedNodeIds.slice(sortedNodeIds.indexOf(nodeId) + 1);
          remainingNodes.forEach((id) => skippedNodes.add(id));
          break;
        }

        if (strategy === 'SKIP') {
          overallStatus = 'PARTIAL';
          this.logger.warn('Node failed with SKIP strategy, continuing', { nodeId, executionId });
          continue;
        }
      }

      // For CONDITION nodes, mark the non-selected branch as skipped
      if (node.type === 'CONDITION' && execResult.output) {
        const { trueTarget, falseTarget, result: condResult } = execResult.output;
        const skippedTarget = condResult ? falseTarget : trueTarget;
        if (skippedTarget) {
          skippedNodes.add(skippedTarget);
        }
      }
    }

    const duration = Date.now() - startTime;

    // Determine final output if no RETURN/RESPONSE_MAPPER node ran
    if (!finalOutput) {
      // Use the last successful node's output
      for (const nodeId of [...sortedNodeIds].reverse()) {
        const output = context.getOutput(nodeId);
        if (output && output.nodeStatus !== 'FAILED') {
          finalOutput = output.data;
          break;
        }
      }
    }

    this.logger.info('Workflow execution completed', {
      executionId,
      status: overallStatus,
      duration,
      nodeCount: nodes.length,
    });

    return {
      executionId,
      status: overallStatus,
      duration,
      output: finalOutput,
      statusCode: finalStatusCode,
      nodeExecutions: context.getNodeExecutionRecords(),
      error: executionError,
    };
  }
}

module.exports = ExecutionEngine;
