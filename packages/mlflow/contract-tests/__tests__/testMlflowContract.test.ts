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

  describe('Prompt Registry', () => {
    const workspace = 'default';
    const promptsBase = '/api/v1/prompts';
    const promptUrl = (name?: string, suffix?: string) =>
      `${promptsBase}${name ? `/${name}` : ''}${suffix ?? ''}?workspace=${workspace}`;

    const promptName = `ct-prompt-${Date.now()}`;

    beforeAll(async () => {
      const setup = await apiClient.post(promptUrl(), {
        name: promptName,
        messages: [{ role: 'system', content: 'You are a helpful assistant.' }],
        // eslint-disable-next-line camelcase
        commit_message: 'initial version',
      });
      expect(setup.success).toBe(true);
    });

    afterAll(async () => {
      await apiClient.delete(promptUrl(promptName)).catch(() => undefined);
    });

    it('should list registered prompts with scope annotation', async () => {
      const result = await apiClient.get(promptUrl());
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptsResponse/content/application/json/schema',
        status: 200,
      });
      expect(result.success).toBe(true);

      const envelope = result.response.data as {
        data?: { prompts?: Array<{ scope?: { type: string } }> };
      };
      const prompts = envelope.data?.prompts ?? [];
      expect(prompts.length).toBeGreaterThan(0);

      const hasProjectScope = prompts.some((p) => p.scope?.type === 'project');
      const hasGlobalScope = prompts.some((p) => p.scope?.type === 'global');
      expect(hasProjectScope).toBe(true);
      expect(hasGlobalScope).toBe(true);
    });

    it('should register a new prompt', async () => {
      const registerName = `ct-register-${Date.now()}`;
      const result = await apiClient.post(promptUrl(), {
        name: registerName,
        messages: [{ role: 'user', content: 'Hello' }],
        // eslint-disable-next-line camelcase
        commit_message: 'test registration',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptVersionResponse/content/application/json/schema',
        status: 201,
      });
      await apiClient.delete(promptUrl(registerName)).catch(() => undefined);
    });

    it('should load a prompt by name', async () => {
      const result = await apiClient.get(promptUrl(promptName));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptVersionResponse/content/application/json/schema',
        status: 200,
      });
    });

    it('should list versions of a prompt', async () => {
      const result = await apiClient.get(promptUrl(promptName, '/versions'));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/PromptVersionsResponse/content/application/json/schema',
        status: 200,
      });
    });

    it('should delete a specific prompt version', async () => {
      const deleteName = `ct-delver-${Date.now()}`;
      const setup = await apiClient.post(promptUrl(), {
        name: deleteName,
        template: 'to be deleted',
        // eslint-disable-next-line camelcase
        commit_message: 'will delete version',
      });
      expect(setup.success).toBe(true);
      const result = await apiClient.delete(promptUrl(deleteName, '/versions/1'));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
      await apiClient.delete(promptUrl(deleteName)).catch(() => undefined);
    });

    it('should delete an entire prompt', async () => {
      const deleteName = `ct-delprompt-${Date.now()}`;
      const setup = await apiClient.post(promptUrl(), {
        name: deleteName,
        template: 'to be deleted',
        // eslint-disable-next-line camelcase
        commit_message: 'will delete prompt',
      });
      expect(setup.success).toBe(true);
      const result = await apiClient.delete(promptUrl(deleteName));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NoContent',
        status: 204,
      });
    });

    it('should return 400 when registering a prompt with invalid name', async () => {
      const result = await apiClient.post(promptUrl(), {
        name: '/invalid/name',
        template: 'Hello',
        // eslint-disable-next-line camelcase
        commit_message: 'test',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when registering a prompt without content', async () => {
      const result = await apiClient.post(promptUrl(), {
        name: 'valid-name',
        // eslint-disable-next-line camelcase
        commit_message: 'test',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when loading a prompt with invalid version', async () => {
      const result = await apiClient.get(`${promptUrl(promptName)}&version=notanumber`);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 when loading a prompt with non-positive version', async () => {
      const result = await apiClient.get(`${promptUrl(promptName)}&version=0`);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });
  });
});
