'use strict';

const mongoose = require('mongoose');
const metricsRegistry = require('../../../infrastructure/metrics/MetricsRegistry');
const { getRedisClient } = require('../../../config/redis');
const { QueueManager } = require('../../../infrastructure/queue/QueueManager');
const config = require('../../../config/env');

class SystemController {
  constructor() {
    this.health = this.health.bind(this);
    this.metrics = this.metrics.bind(this);
    this.liveness = this.liveness.bind(this);
    this.readiness = this.readiness.bind(this);
  }

  async health(req, res, next) {
    try {
      const mongoStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
      
      let redisStatus = 'DOWN';
      try {
        const redisClient = getRedisClient();
        const ping = await redisClient.ping();
        if (ping === 'PONG') redisStatus = 'UP';
      } catch (err) {
        // Suppress error in health response
      }

      let queueStatus = 'UP';
      let queueDetails = [];
      try {
        const queueManager = QueueManager.getInstance();
        queueDetails = await queueManager.getAllQueueStats();
      } catch (err) {
        queueStatus = 'DOWN';
      }

      const status = mongoStatus === 'UP' && redisStatus === 'UP' && queueStatus === 'UP' ? 'UP' : 'DEGRADED';

      res.json({
        success: true,
        data: {
          status,
          version: '1.0.0',
          env: config.env,
          uptime: process.uptime(),
          dependencies: {
            mongodb: mongoStatus,
            redis: redisStatus,
            queue: queueStatus,
          },
          queues: queueDetails,
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
        },
        meta: { correlationId: req.correlationId },
      });
    } catch (err) {
      next(err);
    }
  }

  async metrics(req, res, next) {
    try {
      res.setHeader('Content-Type', metricsRegistry.contentType);
      const data = await metricsRegistry.getMetrics();
      res.send(data);
    } catch (err) {
      next(err);
    }
  }

  liveness(req, res) {
    res.status(200).send('OK');
  }

  async readiness(req, res) {
    const mongoConnected = mongoose.connection.readyState === 1;
    let redisConnected = false;
    try {
      const ping = await getRedisClient().ping();
      redisConnected = ping === 'PONG';
    } catch (e) {}

    if (mongoConnected && redisConnected) {
      res.status(200).send('OK');
    } else {
      res.status(503).send('OUT_OF_SERVICE');
    }
  }
}

module.exports = SystemController;
