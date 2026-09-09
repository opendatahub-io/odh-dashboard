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

  describe('Clone Collection Endpoint', () => {
    it('should clone a collection with custom metadata and benchmark overrides', async () => {
      const cloneRequest = {
        name: 'Cloned Collection',
        description: 'A collection configured for agent evaluation',
        category: 'Safety',
        tags: ['custom', 'agent'],
        custom: {
          evaluates: ['agent'],
          source: 'copy-suite',
        },
        // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
        pass_criteria: { threshold: 0.8 },
        benchmarks: [
          {
            id: 'arc_challenge',
            // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
            provider_id: 'lm_evaluation_harness',
            weight: 0.8,
            // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
            parameters: { num_few_shot: 5 },
          },
        ],
      };
      const result = await apiClient.post(
        '/eval-hub/api/v1/evaluations/collections/collection-001/clones?namespace=default',
        cloneRequest,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/CollectionResponse/content/application/json/schema',
        status: 201,
      });
      if (result.success) {
        expect(result.response.data).toMatchObject({
          data: {
            name: cloneRequest.name,
            description: cloneRequest.description,
            category: cloneRequest.category,
            tags: cloneRequest.tags,
            custom: cloneRequest.custom,
            // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
            pass_criteria: cloneRequest.pass_criteria,
            benchmarks: cloneRequest.benchmarks,
          },
        });
      }
    });

    it('should return the documented not-found response for an unknown collection', async () => {
      const result = await apiClient.post(
        '/eval-hub/api/v1/evaluations/collections/unknown/clones?namespace=default',
        { name: 'Cloned Collection' },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect({ status: result.error.status, data: result.error.data }).toMatchContract(
          apiSchema,
          {
            ref: '#/components/responses/NotFound/content/application/json/schema',
            status: 404,
          },
        );
      }
    });
  });

  describe('Create Evaluation Job Endpoint', () => {
    it('should create a collection-backed run with benchmark configurations', async () => {
      const collection = {
        id: 'collection-001-clone',
        benchmarks: [
          {
            id: 'arc_challenge',
            // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
            provider_id: 'lm_evaluation_harness',
            // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
            parameters: { num_few_shot: 5 },
          },
        ],
      };
      const result = await apiClient.post('/eval-hub/api/v1/evaluations/jobs?namespace=default', {
        name: 'Collection evaluation',
        model: {
          url: 'http://model.example.test/v1',
          name: 'test-model',
        },
        collection,
      });

      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/CreateEvaluationJobResponse/content/application/json/schema',
        status: 201,
      });
      if (result.success) {
        expect(result.response.data).toMatchObject({
          data: { collection },
        });
      }
    });

    it('should reject a run without benchmarks or a collection', async () => {
      const result = await apiClient.post('/eval-hub/api/v1/evaluations/jobs?namespace=default', {
        name: 'Invalid evaluation',
        model: {
          url: 'http://model.example.test/v1',
          name: 'test-model',
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect({ status: result.error.status, data: result.error.data }).toMatchContract(
          apiSchema,
          {
            ref: '#/components/responses/BadRequest/content/application/json/schema',
            status: 400,
          },
        );
      }
    });
  });
});
