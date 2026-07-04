'use strict';

const { Queue } = require('bullmq');
const { QUEUE_NAMES, defaultJobOptions, getQueueConnection } = require('../../config/bullmq');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('BullMQProducer');

/**
 * BullMQ producer that enqueues jobs for parallel workflow execution.
 */
class BullMQProducer {
  constructor() {
    this._queues = new Map();
    this._initQueues();
  }

  /**
   * Initialize queue instances for all defined queues.
   * @private
   */
  _initQueues() {
    const connection = getQueueConnection();
    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queue = new Queue(queueName, {
        connection,
        defaultJobOptions,
      });
      this._queues.set(queueName, queue);
      logger.info(`Queue initialized: ${queueName}`);
    }
  }

  /**
   * Get a queue instance by name.
   * @param {string} queueName
   * @returns {Queue}
   * @private
   */
  _getQueue(queueName) {
    const queue = this._queues.get(queueName);
    if (!queue) throw new Error(`Queue '${queueName}' not initialized`);
    return queue;
  }

  /**
   * Add a single job to a queue.
   * @param {string} queueName
   * @param {string} jobName
   * @param {object} data
   * @param {object} [opts]
   * @returns {Promise<import('bullmq').Job>}
   */
  async addJob(queueName, jobName, data, opts = {}) {
    const queue = this._getQueue(queueName);
    const job = await queue.add(jobName, data, { ...defaultJobOptions, ...opts });
    logger.debug('Job added to queue', { queueName, jobName, jobId: job.id });
    return job;
  }

  /**
   * Add multiple jobs to a queue in bulk.
   * @param {string} queueName
   * @param {Array<{name: string, data: object, opts?: object}>} jobs
   * @returns {Promise<import('bullmq').Job[]>}
   */
  async addBulkJobs(queueName, jobs) {
    const queue = this._getQueue(queueName);
    const bulkJobs = jobs.map((j) => ({
      name: j.name,
      data: j.data,
      opts: { ...defaultJobOptions, ...j.opts },
    }));
    const addedJobs = await queue.addBulk(bulkJobs);
    logger.info('Bulk jobs added to queue', { queueName, count: addedJobs.length });
    return addedJobs;
  }

  /**
   * Get the current state and result of a job.
   * @param {string} queueName
   * @param {string} jobId
   * @returns {Promise<{id: string, state: string, result: any, error: any}>}
   */
  async getJob(queueName, jobId) {
    const queue = this._getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      id: job.id,
      state,
      result: job.returnvalue,
      error: job.failedReason,
      progress: job.progress,
    };
  }

  /**
   * Poll a job until it completes or times out.
   * @param {string} queueName
   * @param {string} jobId
   * @param {number} [timeoutMs=30000]
   * @param {number} [pollIntervalMs=500]
   * @returns {Promise<{status: string, output: any, error: any}>}
   */
  async waitForJob(queueName, jobId, timeoutMs = 30000, pollIntervalMs = 500) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const jobInfo = await this.getJob(queueName, jobId);

      if (!jobInfo) {
        return { status: 'FAILED', output: null, error: { message: 'Job not found' } };
      }

      if (jobInfo.state === 'completed') {
        return { status: 'SUCCESS', output: jobInfo.result, error: null };
      }

      if (jobInfo.state === 'failed') {
        return { status: 'FAILED', output: null, error: { message: jobInfo.error } };
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return {
      status: 'FAILED',
      output: null,
      error: { message: `Job ${jobId} timed out after ${timeoutMs}ms` },
    };
  }

  /**
   * Get queue metrics.
   * @param {string} queueName
   * @returns {Promise<object>}
   */
  async getQueueStats(queueName) {
    const queue = this._getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return { queueName, waiting, active, completed, failed, delayed };
  }

  /**
   * Gracefully close all queue connections.
   * @returns {Promise<void>}
   */
  async close() {
    await Promise.all(Array.from(this._queues.values()).map((q) => q.close()));
    logger.info('All BullMQ queues closed');
  }
}

module.exports = BullMQProducer;
