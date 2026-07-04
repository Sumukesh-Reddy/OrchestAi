'use strict';

const bcrypt = require('bcryptjs');
const config = require('../../../config/env');
const { ConflictError } = require('../../../domain/errors/AppError');
const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');

const logger = createLogger('RegisterUseCase');

class RegisterUseCase {
  constructor(userRepository, emailClient) {
    this.userRepository = userRepository;
    this.emailClient = emailClient;
  }

  async execute({ email, password, role = 'developer', firstName, lastName }) {
    // Check if user already exists
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError(`User with email '${email}' already exists`);
    }

    const passwordHash = await bcrypt.hash(password, config.auth.saltRounds);

    // Generate 6-digit numeric verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const user = await this.userRepository.create({
      email,
      passwordHash,
      role,
      firstName,
      lastName,
      isVerified: false, // Must verify email first
      verificationCode,
      verificationCodeExpiresAt,
    });

    // Send verification email via Resend
    await this.emailClient.sendVerificationEmail(email, verificationCode);

    logger.info('New user registered, verification email dispatched', { userId: user.id, email, role });
    return { user };
  }
}

module.exports = RegisterUseCase;
