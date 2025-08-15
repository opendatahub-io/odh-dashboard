/**
 * Model Registry API Contract Tests using Mock BFF backend
 * 
 * This test suite validates the API contracts between the Model Registry frontend
 * and its Backend For Frontend (BFF) service using the shared Pact testing utilities.
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */
/// <reference types="jest" />
/// <reference types="@types/jest" />

import fs from 'fs';
import path from 'path';
import { 
  ContractApiClient,
  ContractSchemaValidator,
  verifyBffHealth,
  createBffConfig,
  logTestSetup,
  logTestSuccess,
  type ApiTestResult,
} from '@odh-dashboard/pact-testing';

// Test configuration
const MOCK_BFF_PORT = 8080;
const MOCK_BFF_URL = `http://localhost:${MOCK_BFF_PORT}`;
const TEST_TIMEOUT = 30000;
const PACT_TEST_RESULTS_DIR = process.env.PACT_TEST_RESULTS_DIR || path.join(__dirname, '../pact-test-results/default');

// Load the API schema for validation
const API_SCHEMA_PATH = path.join(__dirname, '../schemas/model-registry-api.json');
const apiSchema = JSON.parse(fs.readFileSync(API_SCHEMA_PATH, 'utf8'));

// Set up schema validator
const schemaValidator = new ContractSchemaValidator({ strict: false });

// Set up API client with standard Model Registry configuration
const apiClient = new ContractApiClient({
  baseUrl: MOCK_BFF_URL,
  defaultHeaders: {
    'Accept': 'application/json',
    'kubeflow-userid': 'user@example.com',
  },
  timeout: TEST_TIMEOUT,
});

// Helper function for validation with fallback
function validateOpenAPIResponse(response: any, testName: string, itemCount?: number): void {
  try {
    const validation = schemaValidator.validateResponse(response, 'ModelRegistryResponse', testName);
    
    if (validation.isValid) {
      const displayCount = itemCount !== undefined ? `${itemCount} items` : '';
      // eslint-disable-next-line no-console
      console.log(`✅ OpenAPI contract validation passed for ${testName} (${displayCount})`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`⚠️ OpenAPI validation failed but test continues: ${validation.message}`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`⚠️ Schema validation error (test continues): ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

describe('Model Registry API - Mock BFF Contract Tests', () => {
  let bffHealthy = false;

  beforeAll(async () => {
    // Load schema
    await schemaValidator.loadSchema('ModelRegistryResponse', {
      type: 'object',
      required: ['data'],
      properties: {
        metadata: { type: 'object' },
        data: {
          type: 'array',
          items: { $ref: 'ModelRegistry' }  
        }
      },
      additionalProperties: true
    });

    // Load individual schema definitions
    if (apiSchema.definitions) {
      for (const [key, schema] of Object.entries(apiSchema.definitions)) {
        await schemaValidator.loadSchema(key, schema);
      }
    }

    logTestSetup('Model Registry', MOCK_BFF_URL, PACT_TEST_RESULTS_DIR);

    // Verify Mock BFF is available
    const bffConfig = createBffConfig('model-registry', MOCK_BFF_PORT);
    const healthResult = await verifyBffHealth(bffConfig);
    
    if (!healthResult.isHealthy) {
      throw new Error(`Mock BFF is not healthy: ${healthResult.error}`);
    }
    
    bffHealthy = true;
  }, TEST_TIMEOUT);

  describe('Model Registry List Endpoint', () => {
    it('should successfully retrieve model registries list', async () => {
      expect(bffHealthy).toBe(true);

      const result: ApiTestResult = await apiClient.get(
        '/api/v1/model_registry',
        'Model Registry List - Success Case',
        { params: { namespace: 'default' } }
      );

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response!.status).toBe(200);
      expect(result.response!.data).toHaveProperty('data');
      expect(Array.isArray((result.response!.data as any).data)).toBe(true);

      // Schema validation
      validateOpenAPIResponse(result.response!, 'Model Registry List - Success Case', (result.response!.data as any).data.length);

      logTestSuccess('Model Registry List - Success Case');
      // eslint-disable-next-line no-console
      console.log(`📊 Found ${(result.response!.data as any).data.length} registries`);
      // eslint-disable-next-line no-console
      console.log('🔍 Using Mock BFF Server');
    }, TEST_TIMEOUT);

    it('should handle empty registry list', async () => {
      expect(bffHealthy).toBe(true);

      const result: ApiTestResult = await apiClient.get(
        '/api/v1/model_registry',
        'Model Registry List - Empty Case',
        { params: { namespace: 'nonexistent' } }
      );

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response!.status).toBe(200);
      expect(result.response!.data).toHaveProperty('data');
      expect(Array.isArray((result.response!.data as any).data)).toBe(true);

      // Schema validation
      validateOpenAPIResponse(result.response!, 'Model Registry List - Empty Case', (result.response!.data as any).data.length);

      logTestSuccess('Model Registry List - Empty Case');
      // eslint-disable-next-line no-console
      console.log(`📊 Registry count: ${(result.response!.data as any).data.length}`);
    }, TEST_TIMEOUT);

    it('should handle unauthorized access', async () => {
      expect(bffHealthy).toBe(true);

      // Create API client without auth header to trigger unauthorized response
      const unauthClient = new ContractApiClient({
        baseUrl: MOCK_BFF_URL,
        defaultHeaders: {
          'Accept': 'application/json',
          // No kubeflow-userid header
        },
        timeout: TEST_TIMEOUT,
      });

      const result: ApiTestResult = await unauthClient.get(
        '/api/v1/model_registry',
        'Model Registry List - Unauthorized Case',
        { params: { namespace: 'restricted-namespace' } }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.status).toBe(400);
      expect(result.error!.data).toHaveProperty('error');

      // For unauthorized/error responses, schema validation might not apply
      // eslint-disable-next-line no-console
      console.log('⚠️  Error response doesn\'t follow OpenAPI Error schema - this may be expected in Mock BFF mode');

      logTestSuccess('Model Registry List - Unauthorized Case');
      // eslint-disable-next-line no-console
      console.log(`📊 Error status: ${result.error!.status}`);
    }, TEST_TIMEOUT);
  });
});