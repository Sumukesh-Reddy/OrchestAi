'use strict';

class NoneStrategy {
  async verify() {
    return { anonymous: true };
  }
}

module.exports = NoneStrategy;
