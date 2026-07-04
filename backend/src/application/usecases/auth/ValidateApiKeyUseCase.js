'use strict';

const bcrypt = require('bcryptjs');
const { AuthenticationError } = require('../../../domain/errors/AppError');
const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');

const logger = createLogger('ValidateApiKeyUseCase');

class ValidateApiKeyUseCase {
  constructor(apiKeyRepository) {
    this.apiKeyRepository = apiKeyRepository;
  }

  async execute(rawKey) {
    if (!rawKey || !rawKey.startsWith('ak_')) {
      throw new AuthenticationError('Invalid API key format');
    }

    const prefix = rawKey.substring(0, 11);
    const keyDoc = await this.apiKeyRepository.findByPrefix(prefix, true);

    if (!keyDoc) {
      throw new AuthenticationError('API key not found or revoked');
    }

    if (keyDoc.isExpired && keyDoc.isExpired()) {
      throw new AuthenticationError('API key has expired');
    }

    const isValid = await bcrypt.compare(rawKey, keyDoc.keyHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid API key');
    }

    // Fire-and-forget usage increment
    this.apiKeyRepository.incrementUsage(prefix).catch(() => {});

    logger.info('API key validated', { prefix, userId: keyDoc.userId });

    return {
      valid: true,
      apiKey: keyDoc.toSafeObject(),
      userId: keyDoc.userId?.toString(),
      scopes: keyDoc.scopes,
    };
  }
}

module.exports = ValidateApiKeyUseCase;
