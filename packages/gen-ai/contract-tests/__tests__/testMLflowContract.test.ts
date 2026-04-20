/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('MLflow Prompt Registry Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  const apiSchema = loadOpenAPISchema('bff/openapi/src/gen-ai.yaml');

  describe('List Prompts Endpoint', () => {
    it('should list registered prompts', async () => {
      const result = await apiClient.get('/gen-ai/api/v1/mlflow/prompts?namespace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/paths/~1gen-ai~1api~1v1~1mlflow~1prompts/get/responses/200/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Register Prompt Endpoint', () => {
    it('should register a new prompt', async () => {
      const result = await apiClient.post('/gen-ai/api/v1/mlflow/prompts?namespace=default', {
        name: 'contract-test-prompt',
        messages: [{ role: 'system', content: 'You are a helpful assistant.' }],
        // eslint-disable-next-line camelcase
        commit_message: 'initial version',
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/paths/~1gen-ai~1api~1v1~1mlflow~1prompts/post/responses/201/content/application~1json/schema',
        status: 201,
      });
    });
  });

  describe('Load Prompt Endpoint', () => {
    it('should load a prompt by name', async () => {
      const result = await apiClient.get(
        '/gen-ai/api/v1/mlflow/prompts/contract-test-prompt?namespace=default',
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/paths/~1gen-ai~1api~1v1~1mlflow~1prompts~1{name}/get/responses/200/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('List Prompt Versions Endpoint', () => {
    it('should list versions of a prompt', async () => {
      const result = await apiClient.get(
        '/gen-ai/api/v1/mlflow/prompts/contract-test-prompt/versions?namespace=default',
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/paths/~1gen-ai~1api~1v1~1mlflow~1prompts~1{name}~1versions/get/responses/200/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Delete Prompt Version Endpoint', () => {
    it('should delete a specific prompt version', async () => {
      const result = await apiClient.delete(
        '/gen-ai/api/v1/mlflow/prompts/contract-test-prompt/versions/1?namespace=default',
      );
      expect(result.success).toBe(true);
      expect(result.response?.status).toBe(204);
    });
  });

  describe('Delete Prompt Endpoint', () => {
    it('should delete an entire prompt', async () => {
      const result = await apiClient.delete(
        '/gen-ai/api/v1/mlflow/prompts/contract-test-prompt?namespace=default',
      );
      expect(result.success).toBe(true);
      expect(result.response?.status).toBe(204);
    });
  });
});
