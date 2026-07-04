'use strict';

const promClient = require('prom-client');
const config = require('../../config/env');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('MetricsRegistry');

/**
 * Singleton Prometheus metrics registry.
 */
class MetricsRegistry {
  constructor() {
    this.registry = new promClient.Registry();
    this._initialized = false;
  }

  /**
   * Initialize all metrics and collect default Node.js metrics.
   */
  initialize() {
    if (this._initialized) return;

    if (config.metrics.collectDefaultMetrics) {
      promClient.collectDefaultMetrics({
        register: this.registry,
        prefix: 'orchestai_node_',
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      });
    }

    // HTTP request counter
    this.httpRequestsTotal = new promClient.Counter({
      name: 'orchestai_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // HTTP request duration histogram
    this.httpRequestDurationSeconds = new promClient.Histogram({
      name: 'orchestai_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // Workflow execution counter
    this.workflowExecutionsTotal = new promClient.Counter({
      name: 'orchestai_workflow_executions_total',
      help: 'Total number of workflow executions',
      labelNames: ['workflow_id', 'status'],
      registers: [this.registry],
    });

    // Workflow execution duration
    this.workflowExecutionDurationMs = new promClient.Histogram({
      name: 'orchestai_workflow_execution_duration_ms',
      help: 'Workflow execution duration in milliseconds',
      labelNames: ['workflow_id'],
      buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000],
      registers: [this.registry],
    });

    // Cache hits counter
    this.cacheHitsTotal = new promClient.Counter({
      name: 'orchestai_cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['level', 'operation'],
      registers: [this.registry],
    });

    // Cache misses counter
    this.cacheMissesTotal = new promClient.Counter({
      name: 'orchestai_cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['level'],
      registers: [this.registry],
    });

    // BullMQ jobs counter
    this.bullmqJobsTotal = new promClient.Counter({
      name: 'orchestai_bullmq_jobs_total',
      help: 'Total BullMQ jobs processed',
      labelNames: ['queue', 'status'],
      registers: [this.registry],
    });

    // Active API routes gauge
    this.activeApiRoutesTotal = new promClient.Gauge({
      name: 'orchestai_active_api_routes_total',
      help: 'Total number of active API routes',
      registers: [this.registry],
    });

    // Active workflow executions gauge
    this.activeWorkflowExecutions = new promClient.Gauge({
      name: 'orchestai_active_workflow_executions',
      help: 'Currently running workflow executions',
      registers: [this.registry],
    });

    // Node execution counter per plugin type
    this.nodeExecutionsTotal = new promClient.Counter({
      name: 'orchestai_node_executions_total',
      help: 'Total node executions by type and status',
      labelNames: ['node_type', 'status'],
      registers: [this.registry],
    });

    this._initialized = true;
    logger.info('Metrics registry initialized', {
      metricsCount: Object.keys(this).filter((k) => k !== 'registry' && k !== '_initialized').length,
    });
  }

  /**
   * Get all metrics in Prometheus text format.
   * @returns {Promise<string>}
   */
  async getMetrics() {
    return this.registry.metrics();
  }

  /**
   * Get the content type for the metrics endpoint.
   * @returns {string}
   */
  get contentType() {
    return this.registry.contentType;
  }
}

// Singleton
const metricsRegistry = new MetricsRegistry();
metricsRegistry.initialize();

module.exports = metricsRegistry;
