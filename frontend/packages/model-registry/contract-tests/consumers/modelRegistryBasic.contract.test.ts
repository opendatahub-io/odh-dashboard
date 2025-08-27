/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/consistent-type-assertions */

import * as fs from 'fs';
import * as path from 'path';
import {
  logTestSetup,
  ensureBffHealthy,
  createBffConfig,
  ContractApiClient,
  ContractSchemaValidator,
} from '@odh-dashboard/contract-testing';

// Load JSON Schema for validation
const schemaPath = path.resolve(__dirname, '../schemas/model-registry-api.json');
const apiSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

// Initialize Schema Validator
const schemaValidator = new ContractSchemaValidator();

// Test configuration
const BFF_URL = 'http://localhost:8080';
const TEST_RESULTS_DIR =
  process.env.CONTRACT_TEST_RESULTS_DIR || './contract-tests/contract-test-results/latest';
const DEFAULT_HEADERS = { 'kubeflow-userid': 'user@example.com' };

// Create BFF configuration
const bffConfig = createBffConfig({ url: BFF_URL });

// Create API client
const apiClient = new ContractApiClient({
  baseUrl: BFF_URL,
  defaultHeaders: DEFAULT_HEADERS,
});

describe('Model Registry API - Mock BFF Contract Tests', () => {
  beforeAll(async () => {
    logTestSetup('Model Registry', BFF_URL, TEST_RESULTS_DIR);

    // Load schema definitions
    await schemaValidator.loadSchema('ModelRegistryAPI', apiSchema);

    // Verify Mock BFF is available (throws on failure)
    await ensureBffHealthy({ ...bffConfig, maxRetries: 20, retryDelay: 500 });
  });

  afterAll(async () => {
    // no-op
  });

  describe('Model Registry List Endpoint', () => {
    it('should successfully retrieve model registries list', async () => {
      const result = await apiClient.get('/api/v1/model_registry?namespace=default');

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      if (result.response) {
        expect(result.response.data).toHaveProperty('data');
        expect(Array.isArray((result.response.data as any).data)).toBe(true);

        // Validate with shared matcher (status + schema)
        (expect(result.response) as any).toMatchContract(apiSchema, {
          ref: '#/definitions/ModelRegistryResponse',
          expectedStatus: 200,
        });
        console.log(`📊 Found ${(result.response.data as any).data.length} registries`);
        console.log('🔍 Using Mock BFF Server');
      }
    });

    it('should handle empty registry list', async () => {
      const result = await apiClient.get('/api/v1/model_registry?namespace=nonexistent');

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      if (result.response) {
        expect(result.response.data).toHaveProperty('data');
        expect(Array.isArray((result.response.data as any).data)).toBe(true);
        expect((result.response.data as any).data).toHaveLength(0);

        // Validate with shared matcher (status + schema)
        (expect(result.response) as any).toMatchContract(apiSchema, {
          ref: '#/definitions/ModelRegistryResponse',
          expectedStatus: 200,
        });
        console.log('📊 Registry count: 0');
      }
    });
  });
});
