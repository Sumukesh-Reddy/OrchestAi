'use strict';

const metricsRegistry = require('../../../infrastructure/metrics/MetricsRegistry');

/**
 * Middleware to track HTTP request metrics.
 */
function metricsMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - startTime);
    const durationSeconds = durationNs / 1e9;

    // Normalize route label (avoid high cardinality from IDs)
    const route = req.route ? req.route.path : req.path.replace(/\/[a-f0-9]{24}/g, '/:id');

    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    };

    metricsRegistry.httpRequestsTotal.inc(labels);
    metricsRegistry.httpRequestDurationSeconds.observe(
      { method: req.method, route },
      durationSeconds
    );
  });

  next();
}

module.exports = metricsMiddleware;
