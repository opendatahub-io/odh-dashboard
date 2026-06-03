/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('MLflow API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
  });

  const apiSchema = loadOpenAPISchema('api/openapi/mlflow.yaml');

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const result = await apiClient.get('/healthcheck');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/HealthCheckResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('User Endpoint', () => {
    it('should retrieve current user information', async () => {
      const result = await apiClient.get('/api/v1/user');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ConfigResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Namespaces Endpoint', () => {
    it('should successfully retrieve namespaces list', async () => {
      const result = await apiClient.get('/api/v1/namespaces');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NamespacesResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Experiments Endpoint', () => {
    it('should successfully retrieve experiments list', async () => {
      const result = await apiClient.get('/api/v1/experiments?workspace=test-ns');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ExperimentsResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  // --- Prompt Registry Endpoints ---

  const promptName = `ct-prompt-${Date.now()}`;

  afterAll(async () => {
    await apiClient
      .delete(`/api/v1/prompts/${promptName}?workspace=default`)
      .catch(() => undefined);
  });

  describe('List Prompts Endpoint', () => {
    it('should list registered prompts', async () => {
      const result = await apiClient.get('/api/v1/prompts?workspace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptsResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Register Prompt Endpoint', () => {
    it('should register a new prompt', async () => {
      const result = await apiClient.post('/api/v1/prompts?workspace=default', {
        name: promptName,
        messages: [{ role: 'system', content: 'You are a helpful assistant.' }],
        // eslint-disable-next-line camelcase
        commit_message: 'initial version',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptVersionResponse/content/application/json/schema',
        status: 201,
      });
    });
  });

  describe('Load Prompt Endpoint', () => {
    it('should load a prompt by name', async () => {
      const result = await apiClient.get(`/api/v1/prompts/${promptName}?workspace=default`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptVersionResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('List Prompt Versions Endpoint', () => {
    it('should list versions of a prompt', async () => {
      const result = await apiClient.get(
        `/api/v1/prompts/${promptName}/versions?workspace=default`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptVersionsResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Delete Prompt Version Endpoint', () => {
    it('should delete a specific prompt version', async () => {
      const result = await apiClient.delete(
        `/api/v1/prompts/${promptName}/versions/1?workspace=default`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/paths/~1api~1v1~1prompts~1{name}~1versions~1{version}/delete/responses/204',
        status: 204,
      });
    });
  });

  describe('Delete Prompt Endpoint', () => {
    it('should delete an entire prompt', async () => {
      const result = await apiClient.delete(`/api/v1/prompts/${promptName}?workspace=default`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/paths/~1api~1v1~1prompts~1{name}/delete/responses/204',
        status: 204,
      });
    });
  });
});
