'use strict';

const { NotFoundError } = require('../../../domain/errors/AppError');

class ExecutionLogController {
  constructor({ executionLogRepository, geminiClient }) {
    this.executionLogRepository = executionLogRepository;
    this.geminiClient = geminiClient;

    this.list = this.list.bind(this);
    this.getOne = this.getOne.bind(this);
    this.getStats = this.getStats.bind(this);
    this.debugLog = this.debugLog.bind(this);
  }

  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, status, apiRouteId, workflowId, correlationId, from, to } = req.query;
      const result = await this.executionLogRepository.findAll({
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        status,
        apiRouteId,
        workflowId,
        correlationId,
        from,
        to,
        userId: req.user.userId,
      });

      res.json({ success: true, data: result, meta: { correlationId: req.correlationId } });
    } catch (err) {
      next(err);
    }
  }

  async getOne(req, res, next) {
    try {
      const log = await this.executionLogRepository.findByExecutionId(req.params.id);
      if (!log) throw new NotFoundError(`Execution log '${req.params.id}' not found`);

      res.json({ success: true, data: { log }, meta: { correlationId: req.correlationId } });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req, res, next) {
    try {
      const { from, to } = req.query;
      const stats = await this.executionLogRepository.getStats({ from, to, userId: req.user.userId });

      res.json({ success: true, data: { stats }, meta: { correlationId: req.correlationId } });
    } catch (err) {
      next(err);
    }
  }

  async debugLog(req, res, next) {
    try {
      const log = await this.executionLogRepository.findByExecutionId(req.params.id);
      if (!log) throw new NotFoundError(`Execution log '${req.params.id}' not found`);

      const analysis = await this.geminiClient.debugExecution(log);

      res.json({
        success: true,
        data: {
          executionId: log.executionId,
          status: log.status,
          analysis,
        },
        meta: { correlationId: req.correlationId },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ExecutionLogController;
