'use strict';

const config = require('./env');

/**
 * Queue name constants.
 */
const QUEUE_NAMES = Object.freeze({
  WORKFLOW_PARALLEL: 'workflow-parallel-execution',
  DEAD_LETTER: 'workflow-dead-letter',
  CLEANUP: 'workflow-cleanup',
});

/**
 * Default BullMQ job options.
 */
const defaultJobOptions = Object.freeze({
  removeOnComplete: { count: 100, age: 86400 },
  removeOnFail: { count: 50, age: 604800 },
  attempts: config.bullmq.defaultJobOptions.attempts,
  backoff: config.bullmq.defaultJobOptions.backoff,
});

/**
 * Returns an ioredis connection config object for BullMQ.
 * BullMQ requires maxRetriesPerRequest: null.
 * @returns {object} ioredis connection options
 */
function getQueueConnection() {
  return {
    url: config.redis.url,
    maxRetriesPerRequest: null,
    connectTimeout: 10000,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(500 * Math.pow(2, times - 1), 30000);
    },
  };
}

/**
 * Queue-specific concurrency settings.
 */
const queueSettings = Object.freeze({
  [QUEUE_NAMES.WORKFLOW_PARALLEL]: {
    concurrency: config.bullmq.concurrency,
    limiter: { max: 50, duration: 1000 },
  },
  [QUEUE_NAMES.DEAD_LETTER]: {
    concurrency: 2,
  },
});

module.exports = { QUEUE_NAMES, defaultJobOptions, getQueueConnection, queueSettings };
