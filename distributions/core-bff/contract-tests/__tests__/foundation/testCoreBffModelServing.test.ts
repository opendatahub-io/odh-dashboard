/**
 * @jest-environment node
 */
import {
  apiClient,
  unauthenticatedClient,
  restrictedClient,
  apiSchema,
  expectError,
  expectSuccess,
} from '../helpers';

describe('Core BFF Model Serving', () => {
  describe('ServingRuntimes POST', () => {
    it('should return 401 when no auth token is provided', async () => {
      expectError(
        await unauthenticatedClient.post('/api/servingRuntimes', {
          metadata: { name: 'test', namespace: 'test-ns' },
        }),
        401,
      );
    });

    it('should return 403 for non-admin user', async () => {
      expectError(
        await restrictedClient.post('/api/servingRuntimes', {
          metadata: { name: 'test', namespace: 'test-ns' },
        }),
        403,
      );
    });

    it('should return 400 for missing metadata', async () => {
      expectError(
        await apiClient.post('/api/servingRuntimes', {
          apiVersion: 'serving.kserve.io/v1alpha1',
          kind: 'ServingRuntime',
        }),
        400,
      );
    });

    it('should create a serving runtime and return 200', async () => {
      const result = await apiClient.post('/api/servingRuntimes', {
        apiVersion: 'serving.kserve.io/v1alpha1',
        kind: 'ServingRuntime',
        metadata: { name: 'contract-test-sr', namespace: 'opendatahub' },
        spec: { containers: [] },
      });
      expectSuccess(result);
    });

    it('should handle trailing slash (redirect)', async () => {
      const result = await apiClient.post('/api/servingRuntimes/', {
        apiVersion: 'serving.kserve.io/v1alpha1',
        kind: 'ServingRuntime',
        metadata: { name: 'contract-test-sr-slash', namespace: 'opendatahub' },
        spec: { containers: [] },
      });
      expectSuccess(result);
    });
  });

  describe('Gateway discovery', () => {
    const path = '/api/service/model-serving/api/v1/gateways';

    it('should return validated gateway options with metadata', async () => {
      const result = await apiClient.get(`${path}?namespace=project-a`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/GatewayDiscoveryResponse/content/application/json/schema',
        status: 200,
      });
    });

    it.each([
      '',
      '?namespace=../other',
      '?namespace=a&namespace=b',
      '?namespace=a&path=/secrets',
      '?namespace=a&service=other',
    ])('should reject invalid query %s', async (query) => {
      const error = expectError(await apiClient.get(path + query), 400);
      expect({ status: error.status, data: error.data, headers: error.headers }).toMatchContract(
        apiSchema,
        {
          ref: '#/components/responses/BadRequest/content/application/json/schema',
          status: 400,
        },
      );
    });

    it('should reject arbitrary paths', async () => {
      expectError(await apiClient.get('/api/service/model-serving/nested/deep/path'), 404);
    });

    it('should reject unsupported methods with the documented error and Allow header', async () => {
      const error = expectError(await apiClient.post(`${path}?namespace=project-a`, {}), 405);
      expect({ status: error.status, data: error.data, headers: error.headers }).toMatchContract(
        apiSchema,
        {
          ref: '#/components/responses/ModelServingMethodNotAllowed/content/application/json/schema',
          status: 405,
          headers: { allow: 'GET' },
        },
      );
    });

    it('should require an authenticated caller', async () => {
      expectError(await unauthenticatedClient.get(`${path}?namespace=project-a`), 401);
    });
  });

  describe('llm-d configuration samples', () => {
    const path = '/api/service/model-serving/api/v1/samples/llm-d';
    const topologies = [
      'workload-single-node',
      'workload-multi-node-data-parallel',
      'workload-single-node-pd',
      'workload-multi-node-data-parallel-pd',
    ];

    it.each(
      topologies.flatMap((topology) => [`type=${topology}`, `type=router&topology=${topology}`]),
    )('should return sample configuration YAML for %s', async (query) => {
      const result = await apiClient.get(`${path}?${query}`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/LLMdSampleConfigurationResponse/content/text/yaml/schema',
        status: 200,
        headers: { 'content-type': /text\/yaml/ },
      });
    });

    it.each([
      '',
      '?type=unknown',
      '?type=router',
      '?type=router&topology=unknown',
      '?type=router&topology=../other',
      '?type=workload-single-node&topology=workload-single-node',
      '?type=workload-single-node&type=router',
      '?type=router&topology=workload-single-node&topology=workload-single-node-pd',
      '?type=workload-single-node&service=other',
      '?type=router&topology=workload-single-node&path=/secrets',
    ])('should reject invalid sample query %s', async (query) => {
      const error = expectError(await apiClient.get(path + query), 400);
      expect({ status: error.status, data: error.data, headers: error.headers }).toMatchContract(
        apiSchema,
        { ref: '#/components/responses/BadRequest/content/application/json/schema', status: 400 },
      );
    });

    it('should reject sample writes with the documented error and Allow header', async () => {
      const error = expectError(await apiClient.post(`${path}?type=workload-single-node`, {}), 405);
      expect({ status: error.status, data: error.data, headers: error.headers }).toMatchContract(
        apiSchema,
        {
          ref: '#/components/responses/ModelServingMethodNotAllowed/content/application/json/schema',
          status: 405,
          headers: { allow: 'GET' },
        },
      );
    });

    it('should reject non-allowlisted sample paths', async () => {
      expectError(await apiClient.get(`${path}/extra?type=workload-single-node`), 404);
    });

    it.each(['type=workload-single-node', 'type=router&topology=workload-single-node'])(
      'should require an authenticated caller for %s',
      async (query) => {
        expectError(await unauthenticatedClient.get(`${path}?${query}`), 401);
      },
    );
  });

  describe('Namespace Mutation GET', () => {
    it('should return 401 when no auth token is provided', async () => {
      expectError(await unauthenticatedClient.get('/api/namespaces/test-ns/1'), 401);
    });

    it('should return 400 for context 0 (DSG_CREATION)', async () => {
      expectError(await apiClient.get('/api/namespaces/test-ns/0'), 400);
    });

    it('should return 400 for invalid context', async () => {
      expectError(await apiClient.get('/api/namespaces/test-ns/5'), 400);
    });

    it('should return 400 for system namespace', async () => {
      expectError(await apiClient.get('/api/namespaces/openshift-monitoring/1'), 400);
    });

    it.each([
      [1, 'KSERVE_PROMOTION'],
      [2, 'KSERVE_NIM_PROMOTION'],
      [3, 'RESET'],
    ])('should return 200 for context %i (%s)', async (context) => {
      const result = await apiClient.get(`/api/namespaces/opendatahub/${context}`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/NamespaceMutationResponse',
        status: 200,
      });
    });

    it('should return 200 for dryRun without persisting changes', async () => {
      const result = await apiClient.get('/api/namespaces/opendatahub/1?dryRun=All');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/NamespaceMutationResponse',
        status: 200,
      });
    });
  });
});
