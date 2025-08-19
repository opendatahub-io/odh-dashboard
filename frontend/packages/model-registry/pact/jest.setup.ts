/* eslint-disable no-console */

// Import Jest types explicitly to resolve type conflicts
import { jest } from '@jest/globals';

// Global test timeout for contract tests
jest.setTimeout(30000);

// Log test start for debugging
console.log('🔧 Contract test setup complete');
console.log('🕐 Test timeout: 30s');
