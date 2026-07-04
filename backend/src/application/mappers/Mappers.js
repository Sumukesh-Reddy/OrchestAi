'use strict';

const { JSONPath } = require('jsonpath-plus');

class RequestMapper {
  map(mappingRules, req) {
    if (!mappingRules || typeof mappingRules !== 'object') return req.body;
    const source = { body: req.body, query: req.query, params: req.params, headers: req.headers };
    const result = {};
    for (const [key, expr] of Object.entries(mappingRules)) {
      try {
        if (typeof expr === 'string' && (expr.startsWith('$.') || expr.startsWith('$['))) {
          result[key] = JSONPath({ path: expr, json: source, wrap: false });
        } else {
          result[key] = expr;
        }
      } catch {
        result[key] = null;
      }
    }
    return result;
  }
}

class ResponseMapper {
  map(mappingRules, executionOutput) {
    if (!mappingRules || typeof mappingRules !== 'object') return executionOutput;
    const result = {};
    for (const [key, expr] of Object.entries(mappingRules)) {
      try {
        if (typeof expr === 'string' && expr.startsWith('$.')) {
          result[key] = JSONPath({ path: expr, json: executionOutput, wrap: false });
        } else {
          result[key] = expr;
        }
      } catch {
        result[key] = null;
      }
    }
    return result;
  }
}

module.exports = { RequestMapper, ResponseMapper };
