'use strict';

const ConditionEvaluator = require('../../src/application/execution/ConditionEvaluator');
const ExecutionContext = require('../../src/application/execution/ExecutionContext');

describe('ConditionEvaluator', () => {
  let evaluator;
  let context;

  beforeEach(() => {
    evaluator = new ConditionEvaluator();
    context = new ExecutionContext({
      request: { body: { userId: 42, role: 'admin' } },
      metadata: { executionId: 'test-exec', workflowId: 'test-flow' },
    });
  });

  test('should return true for ALWAYS or missing condition', () => {
    expect(evaluator.evaluate(null, context)).toBe(true);
    expect(evaluator.evaluate({ type: 'ALWAYS' }, context)).toBe(true);
  });

  test('should evaluate STATUS conditions based on node outputs', () => {
    context.setOutput('node_1', { data: { success: true }, nodeStatus: 'SUCCESS' });
    context.setOutput('node_2', { data: { success: false }, nodeStatus: 'FAILED' });

    expect(evaluator.evaluate({ type: 'STATUS', expression: 'node_1.SUCCESS' }, context)).toBe(true);
    expect(evaluator.evaluate({ type: 'STATUS', expression: 'node_1.FAILED' }, context)).toBe(false);
    expect(evaluator.evaluate({ type: 'STATUS', expression: 'node_2.FAILED' }, context)).toBe(true);
    expect(evaluator.evaluate({ type: 'STATUS', expression: 'node_3.SUCCESS' }, context)).toBe(false);
  });

  test('should evaluate JSONLogic EXPRESSION conditions', () => {
    context.setVariable('counter', 10);

    const checkRoleExpr = {
      type: 'EXPRESSION',
      expression: {
        '===': [{ var: 'request.body.role' }, 'admin'],
      },
    };

    const checkCounterExpr = {
      type: 'EXPRESSION',
      expression: {
        '>': [{ var: 'variables.counter' }, 5],
      },
    };

    expect(evaluator.evaluate(checkRoleExpr, context)).toBe(true);
    expect(evaluator.evaluate(checkCounterExpr, context)).toBe(true);
  });
});
