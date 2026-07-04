'use strict';

const ExecutionEngine = require('../../src/application/execution/ExecutionEngine');
const { registry, registerAllPlugins } = require('../../src/application/plugins/PluginRegistry');

describe('ExecutionEngine Integration', () => {
  let engine;

  beforeAll(() => {
    registerAllPlugins();
  });

  beforeEach(() => {
    engine = new ExecutionEngine({ pluginRegistry: registry });
  });

  test('should execute a linear DAG successfully', async () => {
    const workflowVersion = {
      nodes: [
        {
          id: 'val_1',
          type: 'VALIDATOR',
          label: 'Validate Input',
          config: {
            schema: {
              type: 'object',
              required: ['name'],
              properties: { name: { type: 'string' } },
            },
            onFail: 'STOP',
          },
        },
        {
          id: 'tx_1',
          type: 'TRANSFORM',
          label: 'Map Input',
          config: {
            mappings: [
              { from: 'request.body.name', to: 'displayName' },
              { from: 'Processed successfully', to: 'status' },
            ],
          },
        },
        {
          id: 'ret_1',
          type: 'RETURN',
          label: 'Return Response',
          config: {
            sourceNodeId: 'tx_1',
            statusCode: 200,
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'val_1', target: 'tx_1', condition: { type: 'ALWAYS' } },
        { id: 'e2', source: 'tx_1', target: 'ret_1', condition: { type: 'ALWAYS' } },
      ],
    };

    const request = {
      body: { name: 'User' },
      query: {},
      params: {},
      headers: {},
      method: 'POST',
      path: '/test',
    };

    const result = await engine.execute(workflowVersion, request);

    expect(result.status).toBe('SUCCESS');
    expect(result.statusCode).toBe(200);
    expect(result.output).toEqual({
      displayName: 'User',
      status: 'Processed successfully',
    });
    expect(result.nodeExecutions).toHaveLength(3);
    expect(result.nodeExecutions[0].status).toBe('SUCCESS');
    expect(result.nodeExecutions[1].status).toBe('SUCCESS');
    expect(result.nodeExecutions[2].status).toBe('SUCCESS');
  });

  test('should halt execution if validator fails with STOP strategy', async () => {
    const workflowVersion = {
      nodes: [
        {
          id: 'val_1',
          type: 'VALIDATOR',
          label: 'Validate Input',
          config: {
            schema: {
              type: 'object',
              required: ['name'],
            },
            onFail: 'STOP',
          },
        },
        {
          id: 'tx_1',
          type: 'TRANSFORM',
          config: { mappings: [{ from: 'request.body.name', to: 'displayName' }] },
        },
      ],
      edges: [
        { id: 'e1', source: 'val_1', target: 'tx_1', condition: { type: 'ALWAYS' } },
      ],
    };

    const request = { body: {} }; // Missing required 'name' field

    // Validate execution throws Joi/AJV error or rejects appropriately
    await expect(engine.execute(workflowVersion, request)).rejects.toThrow();
  });
});
