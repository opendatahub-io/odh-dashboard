/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/consistent-type-assertions */

// Import Jest globals for TypeScript
/// <reference types="jest" />
/// <reference types="@types/jest" />

import * as fs from 'fs';
import * as path from 'path';
import {
  logTestSetup,
  verifyBffHealth,
  createBffConfig,
  ContractApiClient,
  ContractSchemaValidator,
} from '@odh-dashboard/pact-testing';

// Load JSON Schema for validation
const schemaPath = path.resolve(__dirname, '../schemas/model-registry-api.json');
const apiSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

// Initialize Schema Validator
const schemaValidator = new ContractSchemaValidator();

// Test configuration
const BFF_URL = 'http://localhost:8080';
const TEST_RESULTS_DIR = process.env.PACT_TEST_RESULTS_DIR || './pact/pact-test-results/latest';
const DEFAULT_HEADERS = { 'kubeflow-userid': 'user@example.com' };

// Create BFF configuration
const bffConfig = createBffConfig('Model Registry', 8080);

// Create API client
const apiClient = new ContractApiClient({
  baseUrl: BFF_URL,
  defaultHeaders: DEFAULT_HEADERS,
});

describe('Model Registry API - Mock BFF Contract Tests', () => {
  let bffHealthy = false;

  beforeAll(async () => {
    logTestSetup('Model Registry', BFF_URL, TEST_RESULTS_DIR);

    // Load schema definitions
    await schemaValidator.loadSchema('ModelRegistryAPI', apiSchema);

    // Verify Mock BFF is available
    const healthResult = await verifyBffHealth(bffConfig);
    bffHealthy = healthResult.isHealthy;
    if (!bffHealthy) {
      console.error('❌ Mock BFF is not healthy. Tests will be skipped.');
    }
  });

  describe('Model Registry List Endpoint', () => {
    it('should successfully retrieve model registries list', async () => {
      expect(bffHealthy).toBe(true);

      const result = await apiClient.get(
        '/api/v1/model_registry?namespace=default',
        'Model Registry List - Success Case',
      );

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      if (result.response) {
        expect(result.response.status).toBe(200);
        expect(result.response.data).toHaveProperty('data');
        expect(Array.isArray((result.response.data as any).data)).toBe(true);

        // Validate response against OpenAPI schema
        const validationResult = schemaValidator.validateResponse(
          result.response,
          'ModelRegistryAPI',
          'Model Registry List - Success Case',
          '#/components/schemas/ModelRegistryList',
        );
        expect(validationResult.isValid).toBe(true);
        console.log(`📊 Found ${(result.response.data as any).data.length} registries`);
        console.log('🔍 Using Mock BFF Server');
      }
    });

    it('should handle empty registry list', async () => {
      expect(bffHealthy).toBe(true);

      const result = await apiClient.get(
        '/api/v1/model_registry?namespace=nonexistent',
        'Model Registry List - Empty Case',
      );

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      if (result.response) {
        expect(result.response.status).toBe(200);
        expect(result.response.data).toHaveProperty('data');
        expect(Array.isArray((result.response.data as any).data)).toBe(true);
        expect((result.response.data as any).data).toHaveLength(0);

        // Validate response against OpenAPI schema
        const validationResult = schemaValidator.validateResponse(
          result.response,
          'ModelRegistryAPI',
          'Model Registry List - Empty Case',
          '#/components/schemas/ModelRegistryList',
        );
        expect(validationResult.isValid).toBe(true);
        console.log('📊 Registry count: 0');
      }
    });

    it('should handle unauthorized access', async () => {
      expect(bffHealthy).toBe(true);

      // Make a request without the kubeflow-userid header
      const result = await apiClient.get(
        '/api/v1/model_registry?namespace=restricted-namespace',
        'Model Registry List - Unauthorized Case',
        { headers: { Accept: 'application/json' } }, // Exclude kubeflow-userid
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      if (result.error) {
        expect(result.error.status).toBe(400);
        expect(result.error.data).toHaveProperty('error');
        expect((result.error.data as any).error).toHaveProperty('code', '400');
        expect((result.error.data as any).error).toHaveProperty(
          'message',
          'missing required kubeflow-userid header',
        );

        // Validate error response against OpenAPI schema (optional, as mock BFF might not strictly adhere)
        const validationResult = schemaValidator.validateResponse(
          result.error,
          'ModelRegistryAPI',
          'Model Registry List - Unauthorized Case',
          '#/components/schemas/ErrorResponse',
          true, // Is error response
        );
        if (!validationResult.isValid) {
          console.warn(
            "⚠️ Error response doesn't follow OpenAPI Error schema - this may be expected in Mock BFF mode",
          );
        }
        expect(validationResult.isValid).toBe(true); // Expecting it to pass if it matches the ErrorResponse schema
        console.log('📊 Error status: 400');
      }
    });
  });
});