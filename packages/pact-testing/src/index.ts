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

// =============================================================================
// HELPER UTILITIES - For consistent test logging and setup
// =============================================================================
export * from './helpers/logging';

// =============================================================================
// CORE UTILITIES - Main testing functionality
// =============================================================================

// BFF Health Verification - Works with any BFF backend
export * from './utils/bff-verification';

// HTTP Client - Standardized API client with logging
export { ContractApiClient, type ApiTestConfig, type ApiTestResult } from './utils/api-client';

// Schema Validation - OpenAPI/JSON Schema validation
export { ContractSchemaValidator, type SchemaValidationConfig, type ValidationResult } from './utils/schema-validation';