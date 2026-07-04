'use strict';

const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');

const logger = createLogger('LogoutUseCase');

class LogoutUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ userId, refreshToken }) {
    await this.userRepository.removeRefreshToken(userId, refreshToken);
    logger.info('User logged out', { userId });
  }
}

module.exports = LogoutUseCase;
