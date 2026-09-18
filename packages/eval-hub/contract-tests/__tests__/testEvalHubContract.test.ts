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
      const result = await apiClient.get('/eval-hub/api/v1/evaluations/jobs?namespace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/EvaluationJobsResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Collection by ID Endpoint', () => {
    it('should retrieve a single collection by ID', async () => {
      const result = await apiClient.get(
        '/eval-hub/api/v1/evaluations/collections/collection-001?namespace=default',
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/CollectionResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Evaluation Job Logs Endpoints', () => {
    it('should accept -1 and return the job logs truncation header', async () => {
      const result = await apiClient.get(
        '/eval-hub/api/v1/evaluations/jobs/eval-job-001/logs?namespace=default&tail_lines=-1',
      );

      expect(result).toMatchContract(apiSchema, {
        ref: '#/paths/~1eval-hub~1api~1v1~1evaluations~1jobs~1{id}~1logs/get/responses/200/content/text~1plain/schema',
        status: 200,
        headers: { 'X-Log-Truncated': 'false' },
      });
    });

    it('should reject tail_lines values below -1 for job logs', async () => {
      const result = await apiClient.get(
        '/eval-hub/api/v1/evaluations/jobs/eval-job-001/logs?namespace=default&tail_lines=-2',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
      }
    });

    it('should accept -1 and return the benchmark logs truncation header', async () => {
      const result = await apiClient.get(
        '/eval-hub/api/v1/evaluations/jobs/eval-job-001/benchmarks/0/logs?namespace=default&tail_lines=-1',
      );

      expect(result).toMatchContract(apiSchema, {
        ref: '#/paths/~1eval-hub~1api~1v1~1evaluations~1jobs~1{id}~1benchmarks~1{benchmark_index}~1logs/get/responses/200/content/text~1plain/schema',
        status: 200,
        headers: { 'X-Log-Truncated': 'false' },
      });
    });

    it('should reject tail_lines values below -1 for benchmark logs', async () => {
      const result = await apiClient.get(
        '/eval-hub/api/v1/evaluations/jobs/eval-job-001/benchmarks/0/logs?namespace=default&tail_lines=-2',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
      }
    });
  });
});
