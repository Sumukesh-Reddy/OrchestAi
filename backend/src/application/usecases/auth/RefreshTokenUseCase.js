'use strict';

const jwt = require('jsonwebtoken');
const config = require('../../../config/env');
const { AuthenticationError } = require('../../../domain/errors/AppError');
const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');

const logger = createLogger('RefreshTokenUseCase');

class RefreshTokenUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ refreshToken }) {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (err) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findRawById(decoded.userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    const tokenExists = user.refreshTokens.some((t) => t.token === refreshToken);
    if (!tokenExists) {
      throw new AuthenticationError('Refresh token not recognized. Please login again.');
    }

    // Clean expired tokens
    const now = new Date();
    const validTokens = user.refreshTokens.filter((t) => t.expiresAt > now);
    if (validTokens.length !== user.refreshTokens.length) {
      user.refreshTokens = validTokens;
      await user.save();
    }

    const accessToken = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn, algorithm: config.jwt.algorithm }
    );

    logger.info('Access token refreshed', { userId: user._id.toString() });
    return { accessToken };
  }
}

module.exports = RefreshTokenUseCase;
