/* eslint-disable no-barrel-files/no-barrel-files */

/// <reference types="jest" />

// Import Jest types (this ensures they're available to consuming packages)
import './jest.d.ts';

// Setup Jest matchers
import { toMatchContract } from './matchers/toMatchContract';

console.log('🔧 Setting up Jest matchers...');
// eslint-disable-next-line no-undef
expect.extend({ toMatchContract });
console.log('✅ Jest matchers setup complete');

export { ContractApiClient } from './api-client';
export { ContractSchemaValidator } from './schema-validator';
export { verifyBffHealth, waitForBffHealth } from './bff-health';
export { logTestSetup, logApiCall, logApiResponse, logApiError } from './logging';
export {
  createTestSchema,
  extractSchemaFromOpenApiResponse,
  convertOpenApiToJsonSchema,
} from './schema-converter';
export {};
export { runContractTests, type ContractTestOptions } from './runner';
export {
  OpenApiValidator,
  type OpenApiSource,
  type OperationSelector,
  type ValidationResult,
} from './openapi-validator';
export { loadOpenAPISchema, createSchemaMatcher } from './schema-helpers';

// Export types for TypeScript consumption
export interface ContractTestMatcher {
  toMatchContract: (schema: Record<string, unknown>, options?: Record<string, unknown>) => void;
}
