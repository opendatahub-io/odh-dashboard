/* eslint-env jest */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Model Registry List Endpoint', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  // Option 2: Load OpenAPI schema (recommended approach)
  const apiSchema = loadOpenAPISchema('upstream/api/openapi/mod-arch.yaml');

  it('should successfully retrieve model registries list', async () => {
    const result = await apiClient.get('/api/v1/model_registry?namespace=default', 'list-default');
    expect(result.status).toBe(200);
    expect({ status: result.status, data: result.data }).toMatchContract(apiSchema, {
      ref: '#/components/responses/ModelRegistryResponse/content/application/json/schema',
      expectedStatus: 200,
    });
  });

  it('should handle empty registry list', async () => {
    const result = await apiClient.get(
      '/api/v1/model_registry?namespace=nonexistent',
      'list-empty',
    );
    expect(result.status).toBe(200);
    expect({ status: result.status, data: result.data }).toMatchContract(apiSchema, {
      ref: '#/components/responses/ModelRegistryResponse/content/application/json/schema',
      expectedStatus: 200,
    });
  });
});
