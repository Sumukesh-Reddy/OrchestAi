'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const nodeSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'HTTP_REQUEST',
        'TRANSFORM',
        'CONDITION',
        'PARALLEL',
        'MERGE',
        'RESPONSE_MAPPER',
        'VALIDATOR',
        'RETRY_WRAPPER',
        'CACHE_CHECK',
        'CACHE_WRITE',
        'AI_AGENT',
        'RETURN',
      ],
    },
    label: { type: String, required: true, trim: true, maxlength: 100 },
    config: { type: Schema.Types.Mixed, default: {} },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    onError: {
      strategy: {
        type: String,
        enum: ['STOP', 'SKIP', 'RETRY', 'FALLBACK'],
        default: 'STOP',
      },
      fallbackNodeId: { type: String, default: null },
      maxRetries: { type: Number, default: 3 },
      retryDelayMs: { type: Number, default: 1000 },
    },
  },
  { _id: false }
);

const edgeSchema = new Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    sourceHandle: { type: String, default: null },
    targetHandle: { type: String, default: null },
    label: { type: String, default: null },
    condition: {
      type: {
        type: String,
        enum: ['ALWAYS', 'EXPRESSION', 'STATUS'],
        default: 'ALWAYS',
      },
      expression: { type: String, default: null },
    },
  },
  { _id: false }
);

const versionSchema = new Schema(
  {
    version: { type: Number, required: true },
    nodes: { type: [nodeSchema], default: [] },
    edges: { type: [edgeSchema], default: [] },
    publishedAt: { type: Date, default: Date.now },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    changeLog: { type: String, maxlength: 1000, default: 'Initial version' },
  },
  { _id: false }
);

const workflowSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Workflow name is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    currentVersion: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    versions: {
      type: [versionSchema],
      default: [],
    },
    // Draft state: current unsaved nodes/edges before publish
    draftNodes: { type: [nodeSchema], default: [] },
    draftEdges: { type: [edgeSchema], default: [] },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

workflowSchema.index({ name: 'text', description: 'text' });
workflowSchema.index({ status: 1, isActive: 1 });
workflowSchema.index({ createdBy: 1, createdAt: -1 });
workflowSchema.index({ tags: 1 });

/**
 * Returns the active (current) version object.
 * @returns {object|null}
 */
workflowSchema.methods.getActiveVersion = function () {
  if (this.currentVersion === 0 || this.versions.length === 0) return null;
  return this.versions.find((v) => v.version === this.currentVersion) || null;
};

/**
 * Publishes a new version of this workflow.
 * @param {Array} nodes
 * @param {Array} edges
 * @param {string} userId
 * @param {string} changeLog
 * @returns {object} The new version
 */
workflowSchema.methods.publishVersion = function (nodes, edges, userId, changeLog) {
  const newVersion = this.currentVersion + 1;

  this.versions.push({
    version: newVersion,
    nodes,
    edges,
    publishedAt: new Date(),
    publishedBy: userId || null,
    changeLog: changeLog || `Version ${newVersion}`,
  });

  this.currentVersion = newVersion;
  this.status = 'published';
  this.draftNodes = nodes;
  this.draftEdges = edges;

  return this.versions[this.versions.length - 1];
};

const WorkflowModel = mongoose.model('Workflow', workflowSchema);

module.exports = WorkflowModel;
