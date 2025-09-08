import { toMatchContract } from '../matchers/toMatchContract';

// Extend Jest matchers
expect.extend({
  toMatchContract,
});

// Export for TypeScript
export {};
