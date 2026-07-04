'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const rateLimitSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    windowMs: { type: Number, default: 900000 },
    max: { type: Number, default: 100 },
  },
  { _id: false }
);

const cacheConfigSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    ttl: { type: Number, default: 300 },
    keyTemplate: { type: String, default: null },
  },
  { _id: false }
);

const apiRouteSchema = new Schema(
  {
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
      maxlength: 100,
      index: true,
    },
    method: {
      type: String,
      required: [true, 'HTTP method is required'],
      enum: { values: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], message: 'Invalid HTTP method' },
      uppercase: true,
    },
    path: {
      type: String,
      required: [true, 'Path is required'],
      trim: true,
      maxlength: 500,
    },
    description: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    authStrategy: {
      type: String,
      enum: { values: ['JWT', 'API_KEY', 'NONE'], message: 'Invalid auth strategy' },
      default: 'NONE',
    },
    requiredScopes: {
      type: [String],
      default: [],
    },
    rateLimit: {
      type: rateLimitSchema,
      default: () => ({ enabled: false, windowMs: 900000, max: 100 }),
    },
    requestSchema: {
      type: Schema.Types.Mixed,
      default: null,
    },
    requestMapping: {
      type: Schema.Types.Mixed,
      default: null,
    },
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: 'Workflow',
      required: [true, 'Workflow ID is required'],
      index: true,
    },
    workflowVersion: {
      type: Number,
      default: null, // null = always use latest published version
    },
    cacheConfig: {
      type: cacheConfigSchema,
      default: () => ({ enabled: false, ttl: 300, keyTemplate: null }),
    },
    responseMapping: {
      type: Schema.Types.Mixed,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

apiRouteSchema.index({ method: 1, path: 1, isActive: 1 });
apiRouteSchema.index({ slug: 1, isActive: 1 });
apiRouteSchema.index({ workflowId: 1 });
apiRouteSchema.index({ tags: 1 });
apiRouteSchema.index({ name: 'text', description: 'text', slug: 'text' });

/**
 * Returns a safe representation for client responses.
 * @returns {object}
 */
apiRouteSchema.methods.toResponseObject = function () {
  return {
    id: this._id.toString(),
    slug: this.slug,
    method: this.method,
    path: this.path,
    description: this.description,
    authStrategy: this.authStrategy,
    requiredScopes: this.requiredScopes,
    rateLimit: this.rateLimit,
    requestSchema: this.requestSchema,
    requestMapping: this.requestMapping,
    workflowId: this.workflowId,
    workflowVersion: this.workflowVersion,
    cacheConfig: this.cacheConfig,
    responseMapping: this.responseMapping,
    tags: this.tags,
    isActive: this.isActive,
    version: this.version,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const ApiRouteModel = mongoose.model('ApiRoute', apiRouteSchema);

module.exports = ApiRouteModel;
