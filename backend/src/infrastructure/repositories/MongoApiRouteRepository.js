'use strict';

const ApiRouteModel = require('./models/ApiRouteModel');
const { NotFoundError, ConflictError } = require('../../domain/errors/AppError');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('MongoApiRouteRepository');

/**
 * MongoDB implementation of the API Route repository.
 */
class MongoApiRouteRepository {
  /**
   * Find an API route by ID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const route = await ApiRouteModel.findById(id)
      .populate('workflowId', 'name status currentVersion')
      .populate('createdBy', 'email role')
      .lean();
    return route || null;
  }

  /**
   * Find an API route by its slug.
   * @param {string} slug
   * @returns {Promise<object|null>}
   */
  async findBySlug(slug) {
    const route = await ApiRouteModel.findOne({ slug, isActive: true })
      .populate('workflowId')
      .lean();
    return route || null;
  }

  /**
   * Find API route by HTTP method and path (used by dynamic router).
   * This is on the critical path and should be cached by the caller.
   * @param {string} method
   * @param {string} path
   * @returns {Promise<object|null>}
   */
  async findByMethodAndPath(method, path) {
    const route = await ApiRouteModel.findOne({
      method: method.toUpperCase(),
      path,
      isActive: true,
    })
      .populate('workflowId')
      .lean();
    return route || null;
  }

  /**
   * List API routes with pagination and filtering.
   * @param {object} options
   * @returns {Promise<object>}
   */
  async findAll({ page = 1, limit = 20, isActive, tags, method, search, workflowId, createdBy } = {}) {
    const filter = {};
    if (typeof isActive === 'boolean') filter.isActive = isActive;
    else filter.isActive = true;
    if (tags && tags.length > 0) filter.tags = { $in: tags };
    if (method) filter.method = method.toUpperCase();
    if (search) filter.$text = { $search: search };
    if (workflowId) filter.workflowId = workflowId;
    if (createdBy) filter.createdBy = createdBy;

    const skip = (page - 1) * limit;

    const [routes, total] = await Promise.all([
      ApiRouteModel.find(filter)
        .populate('workflowId', 'name status currentVersion')
        .populate('createdBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ApiRouteModel.countDocuments(filter),
    ]);

    return {
      routes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new API route.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    try {
      const route = await ApiRouteModel.create(data);
      return (await route.populate('workflowId', 'name status')).toObject();
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError(`API route with slug '${data.slug}' already exists`);
      }
      throw err;
    }
  }

  /**
   * Update an API route.
   * @param {string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async update(id, data) {
    try {
      const route = await ApiRouteModel.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).populate('workflowId', 'name status');
      if (!route) throw new NotFoundError(`API Route with ID ${id} not found`);
      return route.toObject();
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError(`API route with slug '${data.slug}' already exists`);
      }
      throw err;
    }
  }

  /**
   * Soft-delete an API route.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const result = await ApiRouteModel.findByIdAndUpdate(id, { $set: { isActive: false } });
    if (!result) throw new NotFoundError(`API Route with ID ${id} not found`);
  }

  /**
   * Count active API routes (for metrics gauge).
   * @returns {Promise<number>}
   */
  async countActive() {
    return ApiRouteModel.countDocuments({ isActive: true });
  }
}

module.exports = MongoApiRouteRepository;
