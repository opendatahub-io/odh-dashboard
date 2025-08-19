/**
 * @odh-dashboard/pact-testing
 *
 * Shared utilities for contract testing across ODH Dashboard packages.
 * Provides reusable components for API testing, BFF verification, schema validation,
 * and consistent logging for packages like model-registry, kserve, etc.
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   ContractApiClient,
 *   verifyBffHealth,
 *   ContractSchemaValidator,
 *   logTestSetup
 * } from '@odh-dashboard/pact-testing';
 *
 * // 1. Set up test logging
 * logTestSetup('my-package', 'http://localhost:8080', './results');
 *
 * // 2. Verify BFF is healthy
 * const health = await verifyBffHealth({ url: 'http://localhost:8080' });
 *
 * // 3. Create API client for testing
 * const apiClient = new ContractApiClient({
 *   baseUrl: 'http://localhost:8080',
 *   defaultHeaders: { 'kubeflow-userid': 'user@example.com' }
 * });
 *
 * // 4. Test API endpoints
 * const result = await apiClient.get('/api/v1/endpoint', 'Test Name');
 *
 * // 5. Validate response schema
 * const validator = new ContractSchemaValidator();
 * await validator.loadSchema('MySchema', schemaObject);
 * validator.validateResponse(result.response, 'MySchema', 'Test Name');
 * ```
 */

/* eslint-disable no-barrel-files/no-barrel-files */
/* eslint-disable import/no-duplicates */

// =============================================================================
// HELPER UTILITIES - For consistent test logging and setup
// =============================================================================
import {
  logApiCall,
  logApiResponse,
  logApiError,
  logTestSetup,
  logTestSuccess,
  type ApiCallHeaders,
  type ApiResponse,
  type ApiError,
} from './helpers/logging';

// =============================================================================
// CORE UTILITIES - Main testing functionality
// =============================================================================

// BFF Health Verification - Works with any BFF backend
import {
  verifyBffHealth,
  waitForBffHealth,
  createBffConfig,
  DEFAULT_BFF_CONFIG,
  type BffConfig,
  type BffHealthResult,
} from './utils/bff-verification';

// HTTP Client - Standardized API client with logging
import { ContractApiClient, type ApiTestConfig, type ApiTestResult } from './utils/api-client';

// Schema Validation - OpenAPI/JSON Schema validation
import {
  ContractSchemaValidator,
  type SchemaValidationConfig,
  type ValidationResult,
} from './utils/schema-validation';

// Re-export everything
export {
  // Logging utilities
  logApiCall,
  logApiResponse,
  logApiError,
  logTestSetup,
  logTestSuccess,
  type ApiCallHeaders,
  type ApiResponse,
  type ApiError,
  // BFF utilities
  verifyBffHealth,
  waitForBffHealth,
  createBffConfig,
  DEFAULT_BFF_CONFIG,
  type BffConfig,
  type BffHealthResult,
  // API client
  ContractApiClient,
  type ApiTestConfig,
  type ApiTestResult,
  // Schema validation
  ContractSchemaValidator,
  type SchemaValidationConfig,
  type ValidationResult,
};
