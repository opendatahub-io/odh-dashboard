/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('AutoRAG API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  // Load the AutoRAG OpenAPI schema
  const apiSchema = loadOpenAPISchema('api/openapi/autorag.yaml');

  describe('LSD Models Endpoint', () => {
    it('should successfully retrieve LSD models list', async () => {
      const result = await apiClient.get('/api/v1/lsd/models?namespace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/LSDModelsResponse/content/application/json/schema',
        status: 200,
      });
    });

    it('should return 400 when namespace query parameter is missing', async () => {
      const result = await apiClient.get('/api/v1/lsd/models');
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
      expect(result.error?.data).toHaveProperty('error');
    });
  });
});
