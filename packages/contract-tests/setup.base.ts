/* eslint-disable no-console */

// Global test timeout for contract tests
jest.setTimeout(30000);

// Log test start for debugging
console.log('🔧 Contract testing setup complete');
console.log('🕐 Test timeout: 30s');

// Register custom matchers
import { toMatchContract } from './src/matchers/toMatchContract';

expect.extend({ toMatchContract });
