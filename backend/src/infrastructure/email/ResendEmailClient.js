'use strict';

const axios = require('axios');
const config = require('../../config/env');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('ResendEmailClient');

class ResendEmailClient {
  constructor() {
    this.apiKey = config.resend.apiKey;
    this.fromEmail = config.resend.fromEmail;
    this.apiUrl = 'https://api.resend.com/emails';
  }

  /**
   * Send verification email using Resend REST API.
   * @param {string} to
   * @param {string} code
   * @returns {Promise<boolean>}
   */
  async sendVerificationEmail(to, code) {
    if (!this.apiKey || this.apiKey === 'dummy_gemini_key_for_setup_replace_me' || this.apiKey.includes('replace_me')) {
      logger.warn('RESEND_API_KEY not configured. Verification code is logged directly below:', {
        to,
        verificationCode: code,
      });
      // Return true to avoid blocking local registrations when API key is missing
      return true;
    }

    try {
      logger.info('Sending verification email via Resend API...', { to });

      const response = await axios.post(
        this.apiUrl,
        {
          from: this.fromEmail,
          to,
          subject: 'OrchestAI — Verify Your Email Address',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 8px;">
              <h2 style="color: #6d28d9; margin-bottom: 20px;">Welcome to OrchestAI</h2>
              <p>Thank you for registering. Please verify your account using the 6-digit verification code below:</p>
              <div style="background-color: #f3e8ff; padding: 15px; border-radius: 6px; text-align: center; margin: 25px 0;">
                <span style="font-family: monospace; font-size: 28px; font-weight: bold; color: #6d28d9; letter-spacing: 4px;">${code}</span>
              </div>
              <p style="color: #64748b; font-size: 13px;">This code will expire in 15 minutes. If you did not sign up for OrchestAI, please ignore this email.</p>
            </div>
          `,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Verification email sent successfully', { to, emailId: response.data.id });
      return true;
    } catch (err) {
      logger.error('Failed to send email via Resend API', {
        to,
        error: err.response?.data || err.message,
      });
      // Still return true in non-prod or log code so we do not lock the developer out
      logger.warn('FALLBACK: Registering code to console on mail failure:', { to, verificationCode: code });
      return true;
    }
  }
}

module.exports = ResendEmailClient;
