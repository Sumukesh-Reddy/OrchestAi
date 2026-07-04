'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Middleware: attach or generate a correlation ID for every request.
 */
function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

module.exports = correlationIdMiddleware;
