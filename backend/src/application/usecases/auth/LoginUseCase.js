'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../../config/env');
const { AuthenticationError, ConflictError } = require('../../../domain/errors/AppError');
const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');

const logger = createLogger('LoginUseCase');

/**
 * Handles user login: validates credentials, issues JWT tokens.
 */
class LoginUseCase {
  /**
   * @param {import('../../../infrastructure/repositories/MongoUserRepository')} userRepository
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Execute login.
   * @param {object} params
   * @param {string} params.email
   * @param {string} params.password
   * @param {object} [params.meta] - { userAgent, ip }
   * @returns {Promise<{accessToken: string, refreshToken: string, user: object}>}
   */
  async execute({ email, password, meta = {} }) {
    // Find user with password hash
    const user = await this.userRepository.findByEmail(email, true);

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isVerified) {
      throw new AuthenticationError('Please verify your email address before logging in');
    }

    // Compare password - user is a raw Mongoose document when includePassword=true
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate tokens
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      algorithm: config.jwt.algorithm,
    });

    const refreshToken = jwt.sign(
      { userId: user._id.toString() },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn, algorithm: config.jwt.algorithm }
    );

    // Calculate refresh token expiry
    const decoded = jwt.decode(refreshToken);
    const expiresAt = new Date(decoded.exp * 1000);

    // Store refresh token in DB
    await this.userRepository.addRefreshToken(user._id.toString(), refreshToken, expiresAt, meta);

    logger.info('User logged in successfully', { userId: user._id.toString(), email: user.email });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}

module.exports = LoginUseCase;
