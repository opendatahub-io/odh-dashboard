/// <reference types="jest" />

// Type declarations for Jest matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toMatchContract: (schema: Record<string, unknown>, options: ContractTestOptions) => R;
    }
  }
}

// Setup Jest matchers
import { toMatchContract } from './matchers/toMatchContract';

console.log('🔧 Setting up Jest matchers...');
expect.extend({ toMatchContract });
console.log('✅ Jest matchers setup complete');

/* eslint-disable no-barrel-files/no-barrel-files */
export { ContractApiClient } from './utils/api-client';
export { ContractSchemaValidator } from './schema-validator';
export { verifyBffHealth, waitForBffHealth } from './bff-health';
export { logTestSetup, logApiCall, logApiResponse, logApiError } from './logging';
export {
  createTestSchema,
  extractSchemaFromOpenApiResponse,
  convertOpenApiToJsonSchema,
} from './schema-converter';
export {};
export { runContractTests, type ContractTestRunnerOptions } from './runner';
export {
  OpenApiValidator,
  type OpenApiSource,
  type OperationSelector,
  type ValidationResult,
} from './openapi-validator';
export { loadOpenAPISchema, createSchemaMatcher } from './schema-helpers';
/* eslint-enable no-barrel-files/no-barrel-files */

// Export types for TypeScript consumption
export interface ContractTestOptions {
  ref: string; // JSON pointer within schema (e.g., "#/definitions/ModelRegistry")
  status?: number;
  headers?: Record<string, string | RegExp>;
}

export interface ContractTestMatcher {
  toMatchContract: (schema: Record<string, unknown>, options: ContractTestOptions) => void;
}
