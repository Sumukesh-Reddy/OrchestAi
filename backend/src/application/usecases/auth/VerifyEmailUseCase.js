'use strict';

const { ValidationError, NotFoundError } = require('../../../domain/errors/AppError');
const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');

const logger = createLogger('VerifyEmailUseCase');

class VerifyEmailUseCase {
  /**
   * @param {import('../../../infrastructure/repositories/MongoUserRepository')} userRepository
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Execute email verification.
   * @param {object} params
   * @param {string} params.email
   * @param {string} params.code
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async execute({ email, code }) {
    if (!email || !code) {
      throw new ValidationError('Email and verification code are required');
    }

    // Retrieve user including hidden verification fields
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError(`User with email '${email}' not found`);
    }

    if (user.isVerified) {
      return { success: true, message: 'Account is already verified' };
    }

    // Since verification fields are marked with select: false in Model,
    // we query them directly using mongoose query builder if needed, or if findByEmail uses lean.
    // Let's retrieve user directly from database using Mongo query to ensure select options are mapped.
    const rawUser = await this.userRepository.findRawById(user.id);
    if (!rawUser) {
      throw new NotFoundError(`User record not found`);
    }

    if (rawUser.verificationCode !== code) {
      throw new ValidationError('Invalid verification code');
    }

    if (new Date() > rawUser.verificationCodeExpiresAt) {
      throw new ValidationError('Verification code has expired. Please sign up again to request a new code.');
    }

    // Update flags
    rawUser.isVerified = true;
    rawUser.verificationCode = undefined;
    rawUser.verificationCodeExpiresAt = undefined;
    await rawUser.save();

    logger.info('User email verified successfully', { userId: rawUser._id.toString(), email: rawUser.email });

    return {
      success: true,
      message: 'Account verified successfully. You can now login.',
    };
  }
}

module.exports = VerifyEmailUseCase;
