'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../../../config/env');
const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');

const logger = createLogger('GenerateApiKeyUseCase');

class GenerateApiKeyUseCase {
  constructor(apiKeyRepository) {
    this.apiKeyRepository = apiKeyRepository;
  }

  async execute({ userId, label, scopes = ['read', 'execute'], expiresAt, description }) {
    // Generate 32-byte random hex key
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const rawKey = `ak_${rawSecret}`;
    const prefix = rawKey.substring(0, 11); // 'ak_' + 8 chars

    const keyHash = await bcrypt.hash(rawKey, config.auth.saltRounds);

    await this.apiKeyRepository.create({
      keyHash,
      rawKey,
      prefix,
      label,
      userId,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      description,
    });

    logger.info('API key generated', { userId, label, prefix });

    return {
      rawKey,   // Shown ONLY once
      prefix,
      label,
      scopes,
      expiresAt,
    };
  }
}

module.exports = GenerateApiKeyUseCase;
