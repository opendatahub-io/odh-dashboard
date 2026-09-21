/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Data Registry BFF Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      Authorization: 'Bearer FAKE_CLUSTER_ADMIN_TOKEN',
    },
  });

  const bffSchema = loadOpenAPISchema('bff/openapi/src/data-registry.yaml');

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const result = await apiClient.get('/healthcheck');
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/HealthCheckResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('User Endpoint', () => {
    it('should retrieve current user information', async () => {
      const result = await apiClient.get('/api/v1/user');
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/ConfigResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Namespaces Endpoint', () => {
    it('should successfully retrieve namespaces list', async () => {
      const result = await apiClient.get('/api/v1/namespaces');
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/NamespacesResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Data Registry Proxy Routes - Upstream Unavailable', () => {
    it('should return 503 for list projects when upstream is unavailable', async () => {
      const result = await apiClient.get('/api/v1/projects');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for get config when upstream is unavailable', async () => {
      const result = await apiClient.get('/api/v1/config');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for list collections when upstream is unavailable', async () => {
      const result = await apiClient.get('/api/v1/test-project/namespaces');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for list tables when upstream is unavailable', async () => {
      const result = await apiClient.get('/api/v1/test-project/namespaces/test-collection/tables');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for get table when upstream is unavailable', async () => {
      const result = await apiClient.get(
        '/api/v1/test-project/namespaces/test-collection/tables/test-table',
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for create table when upstream is unavailable', async () => {
      const result = await apiClient.post(
        '/api/v1/test-project/namespaces/test-collection/tables',
        {
          name: 'new-table',
          schema: {
            type: 'struct',
            fields: [{ id: 1, name: 'col1', type: 'string', required: true }],
          },
        },
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for delete table when upstream is unavailable', async () => {
      const result = await apiClient.delete(
        '/api/v1/test-project/namespaces/test-collection/tables/test-table',
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for list volumes when upstream is unavailable', async () => {
      const result = await apiClient.get('/api/v1/test-project/namespaces/test-collection/volumes');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for search when upstream is unavailable', async () => {
      const result = await apiClient.get('/api/v1/test-project/search?query=sales');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });
  });

  describe('Authentication Error Handling', () => {
    const unauthenticatedClient = new ContractApiClient({
      baseUrl,
    });

    it('should return 400 for user endpoint without auth headers', async () => {
      const result = await unauthenticatedClient.get('/api/v1/user');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 for namespaces endpoint without auth headers', async () => {
      const result = await unauthenticatedClient.get('/api/v1/namespaces');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 for proxy routes without auth headers', async () => {
      const result = await unauthenticatedClient.get('/api/v1/projects');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });
  });
});
