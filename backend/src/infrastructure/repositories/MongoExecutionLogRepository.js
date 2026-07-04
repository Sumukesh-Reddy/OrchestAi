'use strict';

const ExecutionLogModel = require('./models/ExecutionLogModel');
const { NotFoundError } = require('../../domain/errors/AppError');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('MongoExecutionLogRepository');

/**
 * MongoDB implementation of the Execution Log repository.
 */
class MongoExecutionLogRepository {
  /**
   * Create a new execution log entry.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const log = await ExecutionLogModel.create(data);
    return log.toObject();
  }

  /**
   * Update an execution log (used to finalize after execution completes).
   * @param {string} executionId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async update(executionId, data) {
    const log = await ExecutionLogModel.findOneAndUpdate(
      { executionId },
      { $set: data },
      { new: true }
    );
    if (!log) throw new NotFoundError(`Execution log ${executionId} not found`);
    return log.toObject();
  }

  /**
   * Find a log by its executionId UUID.
   * @param {string} executionId
   * @returns {Promise<object|null>}
   */
  async findByExecutionId(executionId) {
    const log = await ExecutionLogModel.findOne({ executionId })
      .populate('apiRouteId', 'slug method path')
      .populate('workflowId', 'name')
      .populate('userId', 'email role')
      .lean();
    return log || null;
  }

  /**
   * List execution logs with pagination, filtering, and date range.
   * @param {object} options
   * @returns {Promise<object>}
   */
  async findAll({ page = 1, limit = 20, status, apiRouteId, workflowId, correlationId, from, to, userId } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (apiRouteId) filter.apiRouteId = apiRouteId;
    if (workflowId) filter.workflowId = workflowId;
    if (correlationId) filter.correlationId = correlationId;
    if (userId) filter.userId = userId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ExecutionLogModel.find(filter)
        .populate('apiRouteId', 'slug method path')
        .populate('workflowId', 'name')
        .select('-nodeExecutions') // Exclude large field from list view
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExecutionLogModel.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Aggregate execution statistics for the dashboard.
   * @param {object} options - { from, to }
   * @returns {Promise<object>}
   */
  async getStats({ from, to, userId } = {}) {
    const mongoose = require('mongoose');
    const matchStage = {};
    let userObjectId = null;
    if (userId) {
      userObjectId = new mongoose.Types.ObjectId(userId);
      matchStage.userId = userObjectId;
    }
    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) matchStage.createdAt.$lte = new Date(to);
    }

    const [statusStats, durationStats, dailyStats] = await Promise.all([
      // Count by status
      ExecutionLogModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Duration percentiles
      ExecutionLogModel.aggregate([
        { $match: { ...matchStage, status: 'SUCCESS' } },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' },
            maxDuration: { $max: '$duration' },
            minDuration: { $min: '$duration' },
            total: { $sum: 1 },
          },
        },
      ]),
      // Daily counts for last 7 days
      ExecutionLogModel.aggregate([
        {
          $match: {
            ...(userObjectId ? { userId: userObjectId } : {}),
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),
    ]);

    const byStatus = statusStats.reduce(
      (acc, s) => ({ ...acc, [s._id]: s.count }),
      { SUCCESS: 0, FAILED: 0, PARTIAL: 0, RUNNING: 0 }
    );

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const successRate = total > 0 ? ((byStatus.SUCCESS / total) * 100).toFixed(2) : 0;

    return {
      total,
      byStatus,
      successRate: parseFloat(successRate),
      avgDuration: durationStats[0] ? Math.round(durationStats[0].avgDuration) : 0,
      maxDuration: durationStats[0] ? durationStats[0].maxDuration : 0,
      dailyStats,
    };
  }

  /**
   * Delete execution logs older than a given date.
   * @param {Date} olderThan
   * @returns {Promise<{deletedCount: number}>}
   */
  async deleteOlderThan(olderThan) {
    const result = await ExecutionLogModel.deleteMany({ createdAt: { $lt: olderThan } });
    logger.info(`Deleted ${result.deletedCount} old execution logs`, { olderThan });
    return { deletedCount: result.deletedCount };
  }
}

module.exports = MongoExecutionLogRepository;
