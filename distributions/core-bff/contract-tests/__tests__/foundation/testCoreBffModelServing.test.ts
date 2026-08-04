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

  describe('Model Serving Proxy', () => {
    it('should proxy GET requests and return 200', async () => {
      expectSuccess(await apiClient.get('/api/service/model-serving/test-path'));
    });

    it('should proxy POST requests and return 200', async () => {
      expectSuccess(await apiClient.post('/api/service/model-serving/test-path', { key: 'value' }));
    });

    it('should proxy PUT requests and return 200', async () => {
      expectSuccess(await apiClient.put('/api/service/model-serving/test-path', { key: 'value' }));
    });

    it('should proxy PATCH requests and return 200', async () => {
      expectSuccess(
        await apiClient.patch('/api/service/model-serving/test-path', { key: 'value' }),
      );
    });

    it('should proxy DELETE requests and return 200', async () => {
      expectSuccess(await apiClient.delete('/api/service/model-serving/test-path'));
    });

    it('should proxy nested paths and return 200', async () => {
      expectSuccess(await apiClient.get('/api/service/model-serving/nested/deep/path'));
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(await unauthenticatedClient.get('/api/service/model-serving/test-path'), 401);
    });
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
