'use strict';

const { Worker } = require('bullmq');
const { QUEUE_NAMES, getQueueConnection, queueSettings } = require('../../config/bullmq');
const ExecutionContext = require('../../application/execution/ExecutionContext');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('BullMQWorker');

/**
 * BullMQ worker that processes parallel workflow node execution jobs.
 */
class BullMQWorker {
  /**
   * @param {object} deps
   * @param {{ get: Function }} deps.pluginRegistry
   */
  constructor({ pluginRegistry } = {}) {
    this.registry = pluginRegistry;
    this._worker = null;
    this._dlqWorker = null;
  }

  /**
   * Start the worker and begin processing jobs.
   * @returns {Promise<void>}
   */
  async start() {
    const settings = queueSettings[QUEUE_NAMES.WORKFLOW_PARALLEL] || { concurrency: 5 };

    this._worker = new Worker(
      QUEUE_NAMES.WORKFLOW_PARALLEL,
      async (job) => this._processJob(job),
      {
        connection: getQueueConnection(),
        concurrency: settings.concurrency,
        limiter: settings.limiter,
      }
    );

    this._worker.on('completed', (job, result) => {
      logger.info('Parallel job completed', {
        jobId: job.id,
        jobName: job.name,
        nodeId: job.data.nodeId,
        executionId: job.data.executionId,
      });
    });

    this._worker.on('failed', async (job, err) => {
      logger.error('Parallel job failed', {
        jobId: job?.id,
        jobName: job?.name,
        nodeId: job?.data?.nodeId,
        executionId: job?.data?.executionId,
        error: err.message,
        attempts: job?.attemptsMade,
      });

      // Move to Dead Letter Queue if max attempts reached
      if (job && job.attemptsMade >= job.opts.attempts) {
        try {
          await this._moveToDlq(job, err);
        } catch (dlqErr) {
          logger.error('Failed to move job to DLQ', { jobId: job.id, error: dlqErr.message });
        }
      }
    });

    this._worker.on('error', (err) => {
      logger.error('BullMQ Worker error', { error: err.message });
    });

    this._worker.on('stalled', (jobId) => {
      logger.warn('Job stalled', { jobId });
    });

    logger.info('BullMQ worker started', {
      queue: QUEUE_NAMES.WORKFLOW_PARALLEL,
      concurrency: settings.concurrency,
    });
  }

  /**
   * Process a single parallel execution job.
   * @param {import('bullmq').Job} job
   * @returns {Promise<object>}
   * @private
   */
  async _processJob(job) {
    const { nodeId, nodeType, nodeConfig, executionId, contextSnapshot } = job.data;

    logger.debug('Processing parallel job', { jobId: job.id, nodeId, nodeType, executionId });

    // Reconstruct minimal execution context from snapshot
    const context = new ExecutionContext({
      request: contextSnapshot.request || {},
      metadata: {
        ...contextSnapshot.metadata,
        nodeType, // Add for CACHE_WRITE detection
      },
      workflowNodes: [],
    });
    context.restoreFromSnapshot(contextSnapshot);

    // Get and execute the plugin
    const plugin = this.registry.get(nodeType);
    const result = await plugin.execute(nodeConfig, context);

    return {
      nodeId,
      nodeType,
      output: result.output,
      nodeStatus: result.nodeStatus || 'SUCCESS',
      error: result.error || null,
    };
  }

  /**
   * Move a failed job to the Dead Letter Queue.
   * @param {import('bullmq').Job} job
   * @param {Error} err
   * @private
   */
  async _moveToDlq(job, err) {
    const { Queue } = require('bullmq');
    const dlqQueue = new Queue(QUEUE_NAMES.DEAD_LETTER, { connection: getQueueConnection() });

    await dlqQueue.add('failed-job', {
      originalJobId: job.id,
      originalQueue: QUEUE_NAMES.WORKFLOW_PARALLEL,
      originalData: job.data,
      failedAt: new Date().toISOString(),
      error: { message: err.message, stack: err.stack },
      attempts: job.attemptsMade,
    });

    await dlqQueue.close();
    logger.info('Job moved to DLQ', { originalJobId: job.id });
  }

  /**
   * Gracefully stop the worker.
   * @returns {Promise<void>}
   */
  async stop() {
    if (this._worker) {
      await this._worker.close();
      this._worker = null;
      logger.info('BullMQ worker stopped');
    }
  }

  /**
   * Get worker metrics.
   * @returns {object}
   */
  getMetrics() {
    if (!this._worker) return { running: false };
    return {
      running: true,
      queue: QUEUE_NAMES.WORKFLOW_PARALLEL,
    };
  }
}

module.exports = BullMQWorker;
