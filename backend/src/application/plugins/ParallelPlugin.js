'use strict';

const BasePlugin = require('./BasePlugin');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('ParallelPlugin');

/**
 * PARALLEL plugin — fans out to multiple nodes via BullMQ for concurrent execution.
 */
class ParallelPlugin extends BasePlugin {
  get type() {
    return 'PARALLEL';
  }

  /**
   * @param {object} config
   * @param {string[]} config.nodeIds - Node IDs to execute in parallel
   * @param {boolean} [config.waitForAll=true] - If false, return after first success
   * @param {number} [config.timeoutMs=30000] - Overall parallel timeout
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<object>}
   */
  async execute(config, context) {
    const { nodeIds = [], waitForAll = true, timeoutMs = 30000 } = config;

    if (nodeIds.length === 0) {
      return {
        output: { results: [], completedCount: 0 },
        nodeStatus: 'SUCCESS',
      };
    }

    logger.info('Starting parallel execution', {
      nodeCount: nodeIds.length,
      nodeIds,
      waitForAll,
      executionId: context.metadata.executionId,
    });

    // Get the workflow nodes for each parallel node
    const parallelNodes = nodeIds
      .map((id) => context.workflowNodes.find((n) => n.id === id))
      .filter(Boolean);

    if (parallelNodes.length === 0) {
      return {
        output: { results: [], completedCount: 0 },
        nodeStatus: 'FAILED',
        error: { message: 'No valid nodes found for parallel execution' },
      };
    }

    // Get BullMQ producer
    let results;
    try {
      const { QueueManager } = require('../../infrastructure/queue/QueueManager');
      const queueManager = QueueManager.getInstance();
      const contextSnapshot = context.toSnapshot();

      // Enqueue all nodes as BullMQ jobs
      const jobs = parallelNodes.map((node) => ({
        name: `parallel-${node.id}-${context.metadata.executionId}`,
        data: {
          nodeId: node.id,
          nodeType: node.type,
          nodeConfig: node.config,
          executionId: context.metadata.executionId,
          contextSnapshot,
        },
        opts: {
          attempts: 1, // Parallel jobs don't retry individually
          removeOnComplete: true,
          removeOnFail: false,
        },
      }));

      const addedJobs = await queueManager.getProducer().addBulkJobs(
        require('../../config/bullmq').QUEUE_NAMES.WORKFLOW_PARALLEL,
        jobs
      );

      // Wait for all jobs to complete with timeout
      const jobPromises = addedJobs.map((job) =>
        queueManager.getProducer().waitForJob(
          require('../../config/bullmq').QUEUE_NAMES.WORKFLOW_PARALLEL,
          job.id,
          timeoutMs
        )
      );

      const settled = await Promise.allSettled(jobPromises);

      results = settled.map((s, i) => ({
        nodeId: parallelNodes[i].id,
        status: s.status === 'fulfilled' ? s.value.status : 'FAILED',
        output: s.status === 'fulfilled' ? s.value.output : null,
        error: s.status === 'rejected' ? { message: s.reason.message } : null,
      }));

    } catch (err) {
      // Fallback to sequential execution if BullMQ is unavailable
      logger.warn('BullMQ unavailable for parallel execution, falling back to sequential', {
        error: err.message,
        executionId: context.metadata.executionId,
      });

      const { registry } = require('./PluginRegistry');
      const nodeResults = await Promise.allSettled(
        parallelNodes.map(async (node) => {
          const plugin = registry.get(node.type);
          const result = await plugin.execute(node.config, context);
          return { nodeId: node.id, ...result };
        })
      );

      results = nodeResults.map((r, i) => ({
        nodeId: parallelNodes[i].id,
        status: r.status === 'fulfilled' ? (r.value.nodeStatus || 'SUCCESS') : 'FAILED',
        output: r.status === 'fulfilled' ? r.value.output : null,
        error: r.status === 'rejected' ? { message: r.reason.message } : null,
      }));
    }

    // Merge results back into context
    for (const result of results) {
      if (result.output !== null) {
        context.setOutput(result.nodeId, {
          data: result.output,
          nodeStatus: result.status,
          error: result.error,
        });
      }
    }

    const successCount = results.filter((r) => r.status !== 'FAILED').length;
    const failedCount = results.filter((r) => r.status === 'FAILED').length;

    return {
      output: {
        results,
        completedCount: successCount,
        failedCount,
        nodeIds,
      },
      nodeStatus: failedCount > 0 && waitForAll ? 'PARTIAL' : 'SUCCESS',
    };
  }

  validate(config) {
    const errors = [];
    if (!config.nodeIds || !Array.isArray(config.nodeIds) || config.nodeIds.length === 0) {
      errors.push('nodeIds must be a non-empty array');
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = ParallelPlugin;
