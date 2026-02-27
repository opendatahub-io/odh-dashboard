/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('EvalHub API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  // Load the EvalHub OpenAPI schema
  const apiSchema = loadOpenAPISchema('bff/openapi/src/eval-hub.yaml');

  describe('API Health Endpoint', () => {
    it('should return API health and version status', async () => {
      const result = await apiClient.get('/eval-hub/api/v1/health');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/HealthResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Namespaces Endpoint', () => {
    it('should successfully retrieve namespaces list', async () => {
      const result = await apiClient.get('/eval-hub/api/v1/namespaces');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NamespacesResponse/content/application/json/schema',
        status: 200,
      });
    });
  });
  describe('Evaluation Jobs Endpoint', () => {
    it('should list evaluation jobs from EvalHub', async () => {
      const result = await apiClient.get('/eval-hub/api/v1/evaluations/jobs');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/EvaluationJobsResponse/content/application/json/schema',
        status: 200,
      });
    });
  });
});
