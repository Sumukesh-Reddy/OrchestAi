'use strict';

const BullMQProducer = require('./BullMQProducer');
const BullMQWorker = require('./BullMQWorker');
const { QUEUE_NAMES } = require('../../config/bullmq');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('QueueManager');

/**
 * Singleton manager for BullMQ queues.
 * Handles lifecycle of producers and workers.
 */
class QueueManager {
  constructor() {
    this._producer = null;
    this._worker = null;
    this._initialized = false;
  }

  /**
   * Get the singleton instance.
   * @returns {QueueManager}
   */
  static getInstance() {
    if (!QueueManager._instance) {
      QueueManager._instance = new QueueManager();
    }
    return QueueManager._instance;
  }

  /**
   * Initialize all queues and start worker.
   * @param {object} [deps] - Dependencies for worker { pluginRegistry }
   * @returns {Promise<void>}
   */
  async initialize(deps = {}) {
    if (this._initialized) return;

    logger.info('Initializing queue manager...');

    this._producer = new BullMQProducer();

    if (deps.pluginRegistry) {
      this._worker = new BullMQWorker({ pluginRegistry: deps.pluginRegistry });
      await this._worker.start();
    }

    this._initialized = true;
    logger.info('Queue manager initialized');
  }

  /**
   * Get the producer instance.
   * @returns {BullMQProducer}
   */
  getProducer() {
    if (!this._producer) {
      throw new Error('QueueManager not initialized. Call initialize() first.');
    }
    return this._producer;
  }

  /**
   * Get the worker instance.
   * @returns {BullMQWorker|null}
   */
  getWorker() {
    return this._worker;
  }

  /**
   * Get stats for all queues.
   * @returns {Promise<object[]>}
   */
  async getAllQueueStats() {
    if (!this._producer) return [];

    const stats = await Promise.all(
      Object.values(QUEUE_NAMES).map((queueName) =>
        this._producer.getQueueStats(queueName).catch((err) => ({
          queueName,
          error: err.message,
        }))
      )
    );

    return stats;
  }

  /**
   * Gracefully shutdown all queues and workers.
   * @returns {Promise<void>}
   */
  async shutdown() {
    logger.info('Shutting down queue manager...');

    if (this._worker) {
      await this._worker.stop();
    }

    if (this._producer) {
      await this._producer.close();
    }

    this._initialized = false;
    logger.info('Queue manager shut down');
  }
}

QueueManager._instance = null;

module.exports = { QueueManager };
