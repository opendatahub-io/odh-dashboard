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
        ref: '#/components/responses/LlamaStackDistributionStatusResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('AAA Models Endpoint', () => {
    it('should list AI Available Assets models', async () => {
      const result = await apiClient.get('/gen-ai/api/v1/aaa/models?namespace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/AAModelsResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('MaaS Models Endpoint', () => {
    it('should list available MaaS models', async () => {
      const result = await apiClient.get('/gen-ai/api/v1/maas/models?namespace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/paths/~1gen-ai~1api~1v1~1maas~1models/get/responses/200/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('NemoGuardrails Init Endpoint', () => {
    it('should initialize NemoGuardrails resources and return the CR name', async () => {
      const result = await apiClient.post(
        '/gen-ai/api/v1/nemo-guardrails/init?namespace=default',
        {},
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NemoGuardrailsInitResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('NemoGuardrails Status Endpoint', () => {
    it('should return NemoGuardrails CR status', async () => {
      const result = await apiClient.get('/gen-ai/api/v1/nemo-guardrails/status?namespace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NemoGuardrailsStatusResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Agent Deployments Endpoint', () => {
    it('should create a stateful mock agent deployment', async () => {
      const result = await apiClient.post('/gen-ai/api/v1/agent-deployments?namespace=llama-stack', {
        name: 'mock-agent',
        agentProfileId: '11111111-1111-1111-1111-111111111111',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/paths/~1gen-ai~1api~1v1~1agent-deployments/post/responses/201/content/application~1json/schema',
        status: 201,
      });
      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      const response = result.response.data as { data: { routeUrl: string } };
      expect(response.data.routeUrl).toMatch(
        /^https:\/\/mock-agent-[a-f0-9]{4}-llama-stack\.apps\.example\.com$/,
      );
    });

    it('should reject an invalid agent profile ID', async () => {
      const result = await apiClient.post('/gen-ai/api/v1/agent-deployments?namespace=llama-stack', {
        name: 'mock-agent',
        agentProfileId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect({
          status: result.error.status,
          headers: result.error.headers,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application/json/schema',
          status: 400,
        });
      }
    });
  });
});
