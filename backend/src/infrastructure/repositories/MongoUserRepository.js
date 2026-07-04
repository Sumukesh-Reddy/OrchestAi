'use strict';

const UserModel = require('./models/UserModel');
const { NotFoundError } = require('../../domain/errors/AppError');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('MongoUserRepository');

/**
 * MongoDB implementation of the User repository.
 */
class MongoUserRepository {
  /**
   * Find user by ID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const user = await UserModel.findById(id);
    return user ? user.toSafeObject() : null;
  }

  /**
   * Find user by email. Optionally include password hash.
   * @param {string} email
   * @param {boolean} includePassword
   * @returns {Promise<object|null>}
   */
  async findByEmail(email, includePassword = false) {
    const query = includePassword
      ? UserModel.findByEmailWithPassword(email)
      : UserModel.findByEmail(email);
    const user = await query;
    if (!user) return null;
    if (includePassword) return user; // Return raw document so bcrypt.compare can access passwordHash
    return user.toSafeObject();
  }

  /**
   * Find raw user document by ID (includes refresh tokens).
   * @param {string} id
   * @returns {Promise<mongoose.Document|null>}
   */
  async findRawById(id) {
    return UserModel.findById(id).select('+refreshTokens +verificationCode +verificationCodeExpiresAt');
  }

  /**
   * Create a new user.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const user = await UserModel.create(data);
    return user.toSafeObject();
  }

  /**
   * Update user by ID.
   * @param {string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async update(id, data) {
    const user = await UserModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!user) throw new NotFoundError(`User with ID ${id} not found`);
    return user.toSafeObject();
  }

  /**
   * Add a refresh token to a user.
   * @param {string} userId
   * @param {string} token
   * @param {Date} expiresAt
   * @param {object} [meta] - Optional { userAgent, ip }
   * @returns {Promise<void>}
   */
  async addRefreshToken(userId, token, expiresAt, meta = {}) {
    const config = require('../../config/env');
    // Remove oldest tokens if user has too many
    await UserModel.findByIdAndUpdate(userId, {
      $push: {
        refreshTokens: {
          $each: [{ token, expiresAt, createdAt: new Date(), ...meta }],
          $slice: -config.auth.maxRefreshTokensPerUser,
        },
      },
      $set: { lastLoginAt: new Date() },
    });
  }

  /**
   * Remove a specific refresh token from a user.
   * @param {string} userId
   * @param {string} token
   * @returns {Promise<void>}
   */
  async removeRefreshToken(userId, token) {
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { token } },
    });
  }

  /**
   * List users with pagination and filtering.
   * @param {object} options
   * @returns {Promise<{users: Array, total: number}>}
   */
  async findAll({ page = 1, limit = 20, role, isActive } = {}) {
    const filter = {};
    if (role) filter.role = role;
    if (typeof isActive === 'boolean') filter.isActive = isActive;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments(filter),
    ]);

    return {
      users: users.map((u) => u.toSafeObject()),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Soft-delete a user by setting isActive to false.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const user = await UserModel.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!user) throw new NotFoundError(`User with ID ${id} not found`);
  }
}

module.exports = MongoUserRepository;
