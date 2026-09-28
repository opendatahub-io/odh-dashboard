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

  describe('Collections Endpoint', () => {
    it('should list system collections with curated ordering', async () => {
      const result = await apiClient.get(
        '/eval-hub/api/v1/evaluations/collections?namespace=default&scope=system&sort_by=curation_order',
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/CollectionsResponse/content/application/json/schema',
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

    it('should patch a collection', async () => {
      const result = await apiClient.patch(
        '/eval-hub/api/v1/evaluations/collections/collection-001?namespace=default',
        [{ op: 'replace', path: '/name', value: 'Updated collection' }],
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/CollectionResponse/content/application/json/schema',
        status: 200,
      });
    });

    it('should delete a collection', async () => {
      const result = await apiClient.delete(
        '/eval-hub/api/v1/evaluations/collections/collection-001?namespace=default',
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(204);
      }
    });
  });

  describe('Create Collection Endpoint', () => {
    it('should create a collection with metadata and evaluation target arrays', async () => {
      const createRequest = {
        name: 'New Collection',
        description: 'A collection created from the suite form',
        domains: ['safety'],
        tasks: ['reasoning'],
        modalities: ['text'],
        industries: ['health'],
        // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
        evaluation_targets: ['model'],
        // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
        pass_criteria: { threshold: 0.7 },
        benchmarks: [
          {
            id: 'arc_challenge',
            // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
            provider_id: 'lm_evaluation_harness',
          },
        ],
      };
      const result = await apiClient.post(
        '/eval-hub/api/v1/evaluations/collections?namespace=default',
        createRequest,
      );

      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/CollectionResponse/content/application/json/schema',
        status: 201,
      });
      if (result.success) {
        expect(result.response.data).toMatchObject({
          data: {
            name: createRequest.name,
            description: createRequest.description,
            domains: createRequest.domains,
            tasks: createRequest.tasks,
            modalities: createRequest.modalities,
            industries: createRequest.industries,
            // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
            evaluation_targets: createRequest.evaluation_targets,
            // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
            pass_criteria: createRequest.pass_criteria,
            benchmarks: createRequest.benchmarks,
          },
        });
      }
    });
  });

  describe('Clone Collection Endpoint', () => {
    it('should clone a collection with custom metadata and benchmark overrides', async () => {
      const cloneRequest = {
        name: 'Cloned Collection',
        description: 'A collection configured for agent evaluation',
        category: 'Safety',
        tags: ['custom', 'agent'],
        domains: ['safety', 'reasoning'],
        tasks: ['classification'],
        modalities: ['text'],
        industries: ['technology'],
        // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
        evaluation_targets: ['agent'],
        custom: {
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
            domains: cloneRequest.domains,
            tasks: cloneRequest.tasks,
            modalities: cloneRequest.modalities,
            industries: cloneRequest.industries,
            // eslint-disable-next-line camelcase -- Eval Hub API contract field name.
            evaluation_targets: cloneRequest.evaluation_targets,
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
