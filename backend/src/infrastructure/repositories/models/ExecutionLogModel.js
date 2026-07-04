'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const nodeExecutionSchema = new Schema(
  {
    nodeId: { type: String, required: true },
    nodeType: { type: String, required: true },
    nodeLabel: { type: String, default: '' },
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED'],
      default: 'PENDING',
    },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    duration: { type: Number, default: 0 },
    input: { type: Schema.Types.Mixed, default: null },
    output: { type: Schema.Types.Mixed, default: null },
    error: { type: Schema.Types.Mixed, default: null },
    retryCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const executionLogSchema = new Schema(
  {
    executionId: {
      type: String,
      required: [true, 'Execution ID is required'],
      unique: true,
      index: true,
    },
    apiRouteId: {
      type: Schema.Types.ObjectId,
      ref: 'ApiRoute',
      default: null,
      index: true,
    },
    apiRouteSlug: {
      type: String,
      default: null,
    },
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: 'Workflow',
      default: null,
    },
    workflowVersion: {
      type: Number,
      default: null,
    },
    correlationId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PARTIAL', 'RUNNING'],
      default: 'RUNNING',
      index: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    request: {
      method: { type: String, default: null },
      path: { type: String, default: null },
      headers: { type: Schema.Types.Mixed, default: {} },
      body: { type: Schema.Types.Mixed, default: null },
      query: { type: Schema.Types.Mixed, default: {} },
      params: { type: Schema.Types.Mixed, default: {} },
    },
    nodeExecutions: {
      type: [nodeExecutionSchema],
      default: [],
    },
    finalOutput: {
      type: Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    userId: {
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

executionLogSchema.index({ createdAt: -1 });
executionLogSchema.index({ apiRouteId: 1, createdAt: -1 });
executionLogSchema.index({ status: 1, createdAt: -1 });
executionLogSchema.index({ workflowId: 1, createdAt: -1 });
executionLogSchema.index({ correlationId: 1 });
// TTL: auto-delete logs older than 90 days
executionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const ExecutionLogModel = mongoose.model('ExecutionLog', executionLogSchema);

module.exports = ExecutionLogModel;
