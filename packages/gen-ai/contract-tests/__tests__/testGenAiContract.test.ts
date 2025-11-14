/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Gen AI API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  // Load the Gen AI OpenAPI schema
  const apiSchema = loadOpenAPISchema('bff/openapi/src/gen-ai.yaml');

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const result = await apiClient.get('/healthcheck');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/HealthCheckResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Namespaces Endpoint', () => {
    it('should successfully retrieve namespaces list', async () => {
      const result = await apiClient.get('/gen-ai/api/v1/namespaces');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NamespacesResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('User Endpoint', () => {
    it('should retrieve current user information', async () => {
      const result = await apiClient.get('/gen-ai/api/v1/user');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/UserResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('LSD Models Endpoint', () => {
    it('should list available AI models', async () => {
      const result = await apiClient.get('/gen-ai/api/v1/lsd/models?namespace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ModelsResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('LSD Status Endpoint', () => {
    it('should retrieve LlamaStack Distribution status', async () => {
      const result = await apiClient.get('/gen-ai/api/v1/lsd/status?namespace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/LSDStatusResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('AAA Models Endpoint', () => {
    it('should list AI Available Assets models', async () => {
      const result = await apiClient.get('/gen-ai/api/v1/aaa/models?namespace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/AAAModelsResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('MaaS Models Endpoint', () => {
    it('should list available MaaS models', async () => {
      const result = await apiClient.get('/gen-ai/api/v1/maas/models?namespace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/MaaSModelsResponse/content/application/json/schema',
        status: 200,
      });
    });
  });
});
