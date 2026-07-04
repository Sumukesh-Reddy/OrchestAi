'use strict';

const mongoose = require('mongoose');
const config = require('./env');
const { createLogger } = require('../infrastructure/logger/WinstonLogger');

const logger = createLogger('database');

let isConnected = false;
let retryCount = 0;

/**
 * Connects to MongoDB with retry logic and event-based logging.
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  mongoose.connection.on('connected', () => {
    isConnected = true;
    retryCount = 0;
    logger.info('MongoDB connection established', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    });
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    logger.info('MongoDB reconnected');
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    logger.error('MongoDB connection error', { error: err.message, stack: err.stack });
  });

  mongoose.connection.on('close', () => {
    isConnected = false;
    logger.info('MongoDB connection closed');
  });

  await attemptConnection();
}

/**
 * Attempts to connect to MongoDB with exponential backoff.
 * @returns {Promise<void>}
 */
async function attemptConnection() {
  try {
    logger.info(`Connecting to MongoDB (attempt ${retryCount + 1}/${config.database.maxRetries})...`);
    await mongoose.connect(config.database.uri, config.database.options);
  } catch (err) {
    retryCount++;
    if (retryCount >= config.database.maxRetries) {
      logger.error('MongoDB connection failed after maximum retries. Exiting.', {
        error: err.message,
        maxRetries: config.database.maxRetries,
      });
      process.exit(1);
    }

    const delay = config.database.retryDelayMs * Math.pow(2, retryCount - 1);
    logger.warn(`MongoDB connection failed. Retrying in ${delay}ms...`, {
      attempt: retryCount,
      error: err.message,
      nextRetryMs: delay,
    });

    await sleep(delay);
    await attemptConnection();
  }
}

/**
 * Gracefully disconnects from MongoDB.
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully');
  }
}

/**
 * Returns current connection status.
 * @returns {boolean}
 */
function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { connectDatabase, disconnectDatabase, isDbConnected };
