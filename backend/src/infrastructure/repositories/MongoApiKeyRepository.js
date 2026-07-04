'use strict';

const ApiKeyModel = require('./models/ApiKeyModel');
const { NotFoundError } = require('../../domain/errors/AppError');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('MongoApiKeyRepository');

/**
 * MongoDB implementation of the API Key repository.
 */
class MongoApiKeyRepository {
  /**
   * Find an API key by its prefix (for lookup during verification).
   * @param {string} prefix
   * @param {boolean} includeHash - Include the key hash for comparison
   * @returns {Promise<object|null>}
   */
  async findByPrefix(prefix, includeHash = false) {
    const query = ApiKeyModel.findOne({ prefix, isActive: true });
    if (includeHash) query.select('+keyHash');
    const key = await query;
    if (!key) return null;
    if (includeHash) return key; // Return raw document for bcrypt.compare
    return key.toSafeObject();
  }

  /**
   * Find an API key by ID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const key = await ApiKeyModel.findById(id);
    return key ? key.toSafeObject() : null;
  }

  /**
   * Create a new API key record.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const key = await ApiKeyModel.create(data);
    return key.toSafeObject();
  }

  /**
   * Update an API key.
   * @param {string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async update(id, data) {
    const key = await ApiKeyModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!key) throw new NotFoundError(`API Key with ID ${id} not found`);
    return key.toSafeObject();
  }

  /**
   * Get all API keys for a user.
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async findByUserId(userId) {
    const keys = await ApiKeyModel.find({ userId, isActive: true }).sort({ createdAt: -1 });
    return keys.map((k) => k.toSafeObject());
  }

  /**
   * Atomically increment the usage count for an API key.
   * Also updates lastUsedAt. Does NOT throw if key not found (fire-and-forget).
   * @param {string} prefix
   * @returns {Promise<void>}
   */
  async incrementUsage(prefix) {
    try {
      await ApiKeyModel.updateOne(
        { prefix },
        { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
      );
    } catch (err) {
      logger.warn('Failed to increment API key usage', { prefix, error: err.message });
    }
  }

  /**
   * Revoke (soft-delete) an API key.
   * @param {string} id
   * @param {string} userId - Owner must match
   * @returns {Promise<void>}
   */
  async revoke(id, userId) {
    const result = await ApiKeyModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!result) throw new NotFoundError(`API Key not found or not owned by user`);
  }

  /**
   * List API keys with optional filters and pagination.
   * @param {object} options
   * @returns {Promise<{keys: Array, total: number}>}
   */
  async findAll({ page = 1, limit = 20, userId, isActive } = {}) {
    const filter = {};
    if (userId) filter.userId = userId;
    if (typeof isActive === 'boolean') filter.isActive = isActive;

    const skip = (page - 1) * limit;

    const [keys, total] = await Promise.all([
      ApiKeyModel.find(filter)
        .populate('userId', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ApiKeyModel.countDocuments(filter),
    ]);

    return {
      keys: keys.map((k) => k.toSafeObject()),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

module.exports = MongoApiKeyRepository;
