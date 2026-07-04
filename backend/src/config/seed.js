'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const { connectDatabase, disconnectDatabase } = require('./database');
const UserModel = require('../infrastructure/repositories/models/UserModel');
const ApiKeyModel = require('../infrastructure/repositories/models/ApiKeyModel');
const WorkflowModel = require('../infrastructure/repositories/models/WorkflowModel');
const ApiRouteModel = require('../infrastructure/repositories/models/ApiRouteModel');
const ExecutionLogModel = require('../infrastructure/repositories/models/ExecutionLogModel');
const { logger } = require('../infrastructure/logger/WinstonLogger');

async function seed() {
  logger.info('Commencing database seeding...');

  try {
    await connectDatabase();

    // Clear existing collections
    logger.info('Clearing existing data collections...');
    await Promise.all([
      UserModel.deleteMany({}),
      ApiKeyModel.deleteMany({}),
      WorkflowModel.deleteMany({}),
      ApiRouteModel.deleteMany({}),
      ExecutionLogModel.deleteMany({}),
    ]);

    // 1. Create Users
    logger.info('Seeding users...');
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('admin1234', salt);
    const devPasswordHash = await bcrypt.hash('developer1234', salt);

    const admin = await UserModel.create({
      email: 'admin@orchestai.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isVerified: true,
      firstName: 'System',
      lastName: 'Administrator',
    });

    const developer = await UserModel.create({
      email: 'dev@orchestai.com',
      passwordHash: devPasswordHash,
      role: 'developer',
      isVerified: true,
      firstName: 'user',
      lastName: 'Developer',
    });

    logger.info('Users seeded: admin@orchestai.com, dev@orchestai.com');

    // 2. Create Sample API Key
    logger.info('Seeding developer API key...');
    const keyHash = await bcrypt.hash('ak_test_key_value_1234567890', salt);
    const apiKey = await ApiKeyModel.create({
      keyHash,
      prefix: 'ak_test_key',
      label: 'Development Test Key',
      userId: developer._id,
      scopes: ['read', 'execute'],
      description: 'Pre-seeded API Key for development testing. Value: ak_test_key_value_1234567890',
    });

    logger.info('API key seeded with prefix "ak_test_key"');

    // 3. Create Sample Workflow (Validate PAN → Fetch User Details from DummyJSON → Transform Response)
    logger.info('Seeding sample workflow...');

    const sampleNodes = [
      {
        id: 'val_1',
        type: 'VALIDATOR',
        label: 'Validate PAN & ID Input',
        position: { x: 400, y: 50 },
        config: {
          inputPath: 'request.body',
          schema: {
            type: 'object',
            required: ['pan', 'userId'],
            properties: {
              pan: { type: 'string', pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$', description: 'PAN Card Format' },
              userId: { type: 'number', minimum: 1, description: 'User ID for DummyJSON lookup' },
            },
          },
          onFail: 'STOP',
        },
      },
      {
        id: 'http_1',
        type: 'HTTP_REQUEST',
        label: 'Fetch User Profile',
        position: { x: 400, y: 200 },
        config: {
          url: 'https://dummyjson.com/users/{{request.body.userId}}',
          method: 'GET',
          timeout: 8000,
        },
      },
      {
        id: 'tx_1',
        type: 'TRANSFORM',
        label: 'Map Client Details',
        position: { x: 400, y: 350 },
        config: {
          mappings: [
            { from: 'request.body.pan', to: 'taxIdentifier' },
            { from: 'outputs.http_1.data.firstName', to: 'profile.firstName' },
            { from: 'outputs.http_1.data.lastName', to: 'profile.lastName' },
            { from: 'outputs.http_1.data.email', to: 'profile.contactEmail' },
            { from: 'outputs.http_1.data.company.name', to: 'employment.companyName' },
            { from: 'outputs.http_1.data.company.title', to: 'employment.role' },
            { from: 'Verified and transformed', to: 'meta.status' },
          ],
        },
      },
      {
        id: 'ret_1',
        type: 'RETURN',
        label: 'Return Standardized Client Profile',
        position: { x: 400, y: 500 },
        config: {
          sourceNodeId: 'tx_1',
          statusCode: 200,
        },
      },
    ];

    const sampleEdges = [
      { id: 'e1', source: 'val_1', target: 'http_1', condition: { type: 'ALWAYS' } },
      { id: 'e2', source: 'http_1', target: 'tx_1', condition: { type: 'ALWAYS' } },
      { id: 'e3', source: 'tx_1', target: 'ret_1', condition: { type: 'ALWAYS' } },
    ];

    const workflow = new WorkflowModel({
      name: 'Client Verification & Profile Enrichment',
      description: 'Validates Indian PAN format, fetches corresponding user details from external service, and returns structured client profile',
      createdBy: developer._id,
      status: 'published',
      currentVersion: 1,
      draftNodes: sampleNodes,
      draftEdges: sampleEdges,
      tags: ['verification', 'enrichment', 'dummyjson'],
      versions: [
        {
          version: 1,
          nodes: sampleNodes,
          edges: sampleEdges,
          publishedAt: new Date(),
          publishedBy: developer._id,
          changeLog: 'Initial production-ready release',
        },
      ],
    });

    await workflow.save();
    logger.info('Sample workflow seeded & published version 1');

    // 4. Create Sample API Route linked to workflow
    logger.info('Seeding sample API route...');
    const apiRoute = await ApiRouteModel.create({
      slug: 'client-enrichment',
      method: 'POST',
      path: '/client/enrich',
      description: 'Exposes client verification workflow with validation and external lookup',
      authStrategy: 'API_KEY', // Requires api key for access
      requiredScopes: ['execute'],
      rateLimit: {
        enabled: true,
        windowMs: 60000,
        max: 30, // 30 req/min
      },
      workflowId: workflow._id,
      workflowVersion: 1,
      isActive: true,
      createdBy: developer._id,
    });

    logger.info('API route seeded: POST /api/v1/exposed/client/enrich');

    logger.info('Database seeding completed successfully.');
  } catch (err) {
    logger.error('Database seeding failed', { error: err.message, stack: err.stack });
  } finally {
    await disconnectDatabase();
  }
}

// Execute seed if run directly
if (require.main === module) {
  seed();
}

module.exports = seed;
