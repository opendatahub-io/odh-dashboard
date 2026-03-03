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

  const apiSchema = loadOpenAPISchema('api/openapi/autorag.yaml');

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const result = await apiClient.get('/healthcheck');
      expect(result.success).toBe(true);
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
      expect(result.success).toBe(true);
    });
  });

  describe('Pipeline Runs Endpoints', () => {
    describe('List Pipeline Runs', () => {
      it('should retrieve pipeline runs list', async () => {
        const result = await apiClient.get('/api/v1/pipeline-runs?namespace=test-namespace');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should support filtering by pipeline version ID', async () => {
        const result = await apiClient.get(
          '/api/v1/pipeline-runs?namespace=test-namespace&pipelineVersionId=22e57c06-030f-4c63-900d-0a808d577899',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should support pagination parameters', async () => {
        const result = await apiClient.get(
          '/api/v1/pipeline-runs?namespace=test-namespace&pageSize=10',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application/json/schema',
          status: 200,
        });
      });
    });

    describe('Get Single Pipeline Run', () => {
      it('should retrieve a single pipeline run by ID', async () => {
        const result = await apiClient.get(
          '/api/v1/pipeline-runs/run-abc123-def456?namespace=test-namespace',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should return 404 for non-existent run ID', async () => {
        const result = await apiClient.get(
          '/api/v1/pipeline-runs/non-existent-run-id?namespace=test-namespace',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });
    });

    describe('Create Pipeline Run', () => {
      it('should create a pipeline run with required fields', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'contract-test-run',
          test_data_secret_name: 'minio-secret',
          test_data_bucket_name: 'autorag',
          test_data_key: 'test_data.json',
          input_data_secret_name: 'minio-secret',
          input_data_bucket_name: 'autorag',
          input_data_key: 'documents/',
          llama_stack_secret_name: 'llama-secret',
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application/json/schema',
          status: 201,
        });
      });

      it('should create a pipeline run with all optional fields', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'full-options-run',
          description: 'Run with all optional fields',
          test_data_secret_name: 'minio-secret',
          test_data_bucket_name: 'autorag',
          test_data_key: 'test_data.json',
          input_data_secret_name: 'minio-secret',
          input_data_bucket_name: 'autorag',
          input_data_key: 'documents/',
          llama_stack_secret_name: 'llama-secret',
          optimization_metric: 'answer_correctness',
          embeddings_models: ['model-a', 'model-b'],
          generation_models: ['gen-model-1'],
          vector_database_id: 'vectordb-123',
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application/json/schema',
          status: 201,
        });
      });

      it('should return 400 for missing required fields', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'incomplete-run',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for invalid optimization metric', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'bad-metric-run',
          test_data_secret_name: 's',
          test_data_bucket_name: 'b',
          test_data_key: 'k',
          input_data_secret_name: 's',
          input_data_bucket_name: 'b',
          input_data_key: 'k',
          llama_stack_secret_name: 's',
          optimization_metric: 'invalid_metric',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for unknown JSON fields', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'test',
          unknown_field: 'should be rejected',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });
  });
});
