'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const apiKeySchema = new Schema(
  {
    keyHash: {
      type: String,
      required: [true, 'Key hash is required'],
      select: false,
    },
    rawKey: {
      type: String,
      default: null,
    },
    prefix: {
      type: String,
      required: [true, 'Key prefix is required'],
      unique: true,
      index: true,
      maxlength: 16,
    },
    label: {
      type: String,
      required: [true, 'Label is required'],
      trim: true,
      maxlength: 100,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    scopes: {
      type: [String],
      enum: {
        values: ['read', 'execute', 'admin'],
        message: 'Scope must be read, execute, or admin',
      },
      default: ['read', 'execute'],
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

apiKeySchema.index({ userId: 1, isActive: 1 });
apiKeySchema.index({ prefix: 1, isActive: 1 });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $ne: null } } });

/**
 * Checks if this API key has expired.
 * @returns {boolean}
 */
apiKeySchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

/**
 * Returns a safe representation without the hash.
 * @returns {object}
 */
apiKeySchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    prefix: this.prefix,
    label: this.label,
    userId: this.userId,
    scopes: this.scopes,
    expiresAt: this.expiresAt,
    isActive: this.isActive,
    lastUsedAt: this.lastUsedAt,
    usageCount: this.usageCount,
    description: this.description,
    rawKey: this.rawKey || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const ApiKeyModel = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKeyModel;
