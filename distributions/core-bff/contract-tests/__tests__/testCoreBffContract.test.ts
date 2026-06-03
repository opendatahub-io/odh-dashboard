/**
 * @jest-environment node
 */
import {
  ContractApiClient,
  ApiTestResultError,
  loadOpenAPISchema,
} from '@odh-dashboard/contract-tests';

describe('Core BFF API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'x-forwarded-access-token': 'FAKE_CLUSTER_ADMIN_TOKEN',
    },
  });
  const unauthenticatedClient = new ContractApiClient({ baseUrl });
  const restrictedClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'x-forwarded-access-token': 'FAKE_USER_B_TOKEN',
    },
  });

  const apiSchema = loadOpenAPISchema('../bff/openapi/src/core-bff.yaml');

  describe('Health Check Endpoints', () => {
    it('should return health status from infrastructure endpoint', async () => {
      const result = await apiClient.get('/healthcheck');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/HealthCheckResponse/content/application/json/schema',
        status: 200,
      });
    });

    it('should return health status from API endpoint', async () => {
      const result = await apiClient.get('/api/v1/healthcheck');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/HealthCheckResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('User Endpoint', () => {
    it('should return current user identity', async () => {
      const result = await apiClient.get('/api/v1/user');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/UserResponse/content/application/json/schema',
        status: 200,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const body = result.response.data as { data: { userId: string; clusterAdmin: boolean } };
        expect(body.data).toHaveProperty('userId');
        expect(body.data).toHaveProperty('clusterAdmin');
      }
    });

    it('should return 401 when no auth token is provided', async () => {
      const result = await unauthenticatedClient.get('/api/v1/user');
      expect(result.success).toBe(false);
      const { status, data, headers } = (result as ApiTestResultError).error;
      expect({ status, data, headers }).toMatchContract(apiSchema, {
        ref: '#/components/responses/Unauthorized/content/application~1json/schema',
        status: 401,
      });
    });
  });

  describe('Namespaces Endpoint', () => {
    it('should return accessible namespaces for cluster admin', async () => {
      const result = await apiClient.get('/api/v1/namespaces');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/NamespacesResponse/content/application/json/schema',
        status: 200,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const body = result.response.data as { data: { name: string }[] };
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);
      }
    });

    it('should return 401 when no auth token is provided', async () => {
      const result = await unauthenticatedClient.get('/api/v1/namespaces');
      expect(result.success).toBe(false);
      const { status, data, headers } = (result as ApiTestResultError).error;
      expect({ status, data, headers }).toMatchContract(apiSchema, {
        ref: '#/components/responses/Unauthorized/content/application~1json/schema',
        status: 401,
      });
    });
  });

  describe('Kubernetes API Proxy', () => {
    describe('GET', () => {
      it('should return 401 when no auth token is provided', async () => {
        const result = await unauthenticatedClient.get('/api/k8s/api/v1/namespaces');
        expect(result.success).toBe(false);
        const { status, data, headers } = (result as ApiTestResultError).error;
        expect({ status, data, headers }).toMatchContract(apiSchema, {
          ref: '#/components/responses/Unauthorized/content/application~1json/schema',
          status: 401,
        });
      });

      it('should proxy GET to K8s API and return namespaces', async () => {
        const result = await apiClient.get('/api/k8s/api/v1/namespaces');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/K8sProxySuccess/content/application/json/schema',
          status: 200,
        });
      });

      it('should return 403 for unauthorized K8s resources', async () => {
        const result = await restrictedClient.get('/api/k8s/api/v1/namespaces');
        expect(result.success).toBe(false);
        const { status, data, headers } = (result as ApiTestResultError).error;
        expect({ status, data, headers }).toMatchContract(apiSchema, {
          ref: '#/components/responses/Forbidden/content/application~1json/schema',
          status: 403,
        });
      });

      it('should return 404 for non-existent K8s resources', async () => {
        const result = await apiClient.get(
          '/api/k8s/api/v1/namespaces/nonexistent-namespace-12345',
        );
        expect(result.success).toBe(false);
        const { status, data, headers } = (result as ApiTestResultError).error;
        expect({ status, data, headers }).toMatchContract(apiSchema, {
          ref: '#/components/responses/NotFound/content/application~1json/schema',
          status: 404,
        });
      });
    });

    describe('POST', () => {
      const namespace = 'opendatahub';
      const configMapPath = `/api/k8s/api/v1/namespaces/${namespace}/configmaps`;

      afterAll(async () => {
        await apiClient.delete(`${configMapPath}/contract-test-post-cm`);
      });

      it('should create a ConfigMap via K8s proxy', async () => {
        const result = await apiClient.post(configMapPath, {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: { name: 'contract-test-post-cm', namespace },
          data: { key: 'value' },
        });
        expect(result.success).toBe(true);
        if (result.success) {
          const body = result.response.data as { metadata: { name: string } };
          expect(result.response.status).toBe(201);
          expect(body.metadata.name).toBe('contract-test-post-cm');
        }
      });

      it('should return 403 when restricted user creates in unauthorized namespace', async () => {
        const result = await restrictedClient.post(configMapPath, {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: { name: 'unauthorized-cm', namespace },
          data: { key: 'value' },
        });
        expect(result.success).toBe(false);
        const { status } = (result as ApiTestResultError).error;
        expect(status).toBe(403);
      });
    });

    describe('PUT', () => {
      const namespace = 'opendatahub';
      const configMapName = 'contract-test-put-cm';
      const configMapPath = `/api/k8s/api/v1/namespaces/${namespace}/configmaps`;

      beforeAll(async () => {
        await apiClient.post(configMapPath, {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: { name: configMapName, namespace },
          data: { key: 'original' },
        });
      });

      afterAll(async () => {
        await apiClient.delete(`${configMapPath}/${configMapName}`);
      });

      it('should update a ConfigMap via K8s proxy', async () => {
        const result = await apiClient.put(`${configMapPath}/${configMapName}`, {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: { name: configMapName, namespace },
          data: { key: 'updated' },
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/K8sProxySuccess/content/application/json/schema',
          status: 200,
        });
        if (result.success) {
          const body = result.response.data as { data: { key: string } };
          expect(body.data.key).toBe('updated');
        }
      });
    });

    describe('DELETE', () => {
      const namespace = 'opendatahub';
      const configMapName = 'contract-test-delete-cm';
      const configMapPath = `/api/k8s/api/v1/namespaces/${namespace}/configmaps`;

      beforeAll(async () => {
        await apiClient.post(configMapPath, {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: { name: configMapName, namespace },
          data: { key: 'to-delete' },
        });
      });

      it('should delete a ConfigMap via K8s proxy', async () => {
        const result = await apiClient.delete(`${configMapPath}/${configMapName}`);
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/K8sProxySuccess/content/application/json/schema',
          status: 200,
        });
      });

      it('should return 404 when deleting a non-existent resource', async () => {
        const result = await apiClient.delete(`${configMapPath}/nonexistent-cm-12345`);
        expect(result.success).toBe(false);
        const { status, data, headers } = (result as ApiTestResultError).error;
        expect({ status, data, headers }).toMatchContract(apiSchema, {
          ref: '#/components/responses/NotFound/content/application~1json/schema',
          status: 404,
        });
      });
    });

    // PATCH is not tested because ContractApiClient does not expose a patch method.
    // The proxy layer handles PATCH identically to POST/PUT/DELETE.
  });
});
