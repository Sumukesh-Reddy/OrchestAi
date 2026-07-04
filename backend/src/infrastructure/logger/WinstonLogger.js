'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../../config/env');

const { combine, timestamp, json, colorize, printf, errors, metadata } = winston.format;

/**
 * Custom format for development: colorized, human-readable.
 */
const devFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  colorize({ all: true }),
  printf(({ level, message, timestamp: ts, service, correlationId, module: mod, ...rest }) => {
    const meta = Object.keys(rest).length > 0 ? ` | ${JSON.stringify(rest)}` : '';
    const corr = correlationId ? ` [${correlationId}]` : '';
    const svc = mod ? `[${mod}]` : `[${service || 'app'}]`;
    return `${ts} ${level} ${svc}${corr}: ${message}${meta}`;
  })
);

/**
 * Production format: structured JSON for log aggregation.
 */
const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
  json()
);

/**
 * Shared transport for rotating daily log files.
 * @param {string} level
 * @param {string} filename
 * @returns {DailyRotateFile}
 */
function createFileTransport(level, filename) {
  return new DailyRotateFile({
    level,
    filename: `${config.logging.dir}/${filename}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    format: prodFormat,
    handleExceptions: level === 'error',
    handleRejections: level === 'error',
  });
}

/**
 * Root Winston logger instance.
 */
const rootLogger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: 'api-orchestration' },
  format: config.isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
    createFileTransport('info', 'app'),
    createFileTransport('error', 'error'),
  ],
  exitOnError: false,
});

/**
 * Creates a child logger with a module-specific label.
 * @param {string} moduleName - The name of the module using this logger.
 * @returns {winston.Logger}
 */
function createLogger(moduleName) {
  return rootLogger.child({ module: moduleName });
}

module.exports = { logger: rootLogger, createLogger };
