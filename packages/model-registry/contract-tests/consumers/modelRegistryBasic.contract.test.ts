// Tests rely on shared matcher for validation; avoid broad disables

import * as fs from 'fs';
import * as path from 'path';
import { setupContractTest, ContractApiClient } from '@odh-dashboard/contract-testing';

// Load JSON Schema for validation
const schemaPath = path.resolve(__dirname, '../schemas/model-registry-api.json');
const apiSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

// Test configuration
const BFF_URL = 'http://localhost:8080';
const TEST_RESULTS_DIR =
  process.env.CONTRACT_TEST_RESULTS_DIR || './contract-tests/contract-test-results/latest';
const DEFAULT_HEADERS = { 'kubeflow-userid': 'user@example.com' };
let apiClient: Pick<ContractApiClient, 'get'>;

describe('Model Registry API - Mock BFF Contract Tests', () => {
  beforeAll(async () => {
    const setup = await setupContractTest({
      packageName: 'Model Registry',
      baseUrl: BFF_URL,
      schema: apiSchema,
      resultsDir: TEST_RESULTS_DIR,
      defaultHeaders: DEFAULT_HEADERS,
    });
    apiClient = setup.apiClient;
  });

  afterAll(async () => {
    // no-op
  });

  describe('Model Registry List Endpoint', () => {
    it('should successfully retrieve model registries list', async () => {
      const result = await apiClient.get('/api/v1/model_registry?namespace=default');
      expect(result.success).toBe(true);
      expect(result.response).toMatchContract(apiSchema, {
        ref: '#/definitions/ModelRegistryResponse',
        expectedStatus: 200,
      });
    });

    it('should handle empty registry list', async () => {
      const result = await apiClient.get('/api/v1/model_registry?namespace=nonexistent');
      expect(result.success).toBe(true);
      expect(result.response).toMatchContract(apiSchema, {
        ref: '#/definitions/ModelRegistryResponse',
        expectedStatus: 200,
      });
    });
  });
});
