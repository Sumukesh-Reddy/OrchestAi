'use strict';

const morgan = require('morgan');
const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');

const logger = createLogger('http');

// Custom Morgan token for correlation ID
morgan.token('correlationId', (req) => req.correlationId || '-');
morgan.token('userId', (req) => (req.user && req.user.userId) || '-');

const format = ':method :url :status :response-time ms - :res[content-length] bytes | correlationId=:correlationId userId=:userId';

/**
 * Morgan HTTP request logger using Winston as stream.
 */
const requestLogger = morgan(format, {
  stream: {
    write(message) {
      // Remove trailing newline
      logger.info(message.trim(), { type: 'http-access' });
    },
  },
  skip(req) {
    // Skip health check routes to reduce noise
    return req.path === '/health' || req.path === '/live' || req.path === '/ready';
  },
});

module.exports = requestLogger;
