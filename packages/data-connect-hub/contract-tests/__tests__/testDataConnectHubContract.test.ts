/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

const connectionId = '550e8400-e29b-41d4-a716-446655440001';
const unknownResourceId = '550e8400-e29b-41d4-a716-446655440099';
const postgresqlConnectionTypeId = '550e8400-e29b-41d4-a716-446655440003';

describe('Data Connect Hub BFF Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      Authorization: 'Bearer FAKE_CLUSTER_ADMIN_TOKEN',
    },
  });

  const bffSchema = loadOpenAPISchema('api/openapi/data-connect-hub.yaml');

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
    it('should successfully retrieve namespaces', async () => {
      const result = await apiClient.get('/api/v1/namespaces');
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/NamespacesResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Connections Endpoint', () => {
    it('should retrieve connections for a project', async () => {
      const result = await apiClient.get('/api/v1/connections?namespace=default');
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/ConnectionsResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should create a connection for a project', async () => {
      const result = await apiClient.post('/api/v1/connections?namespace=default', {
        name: 'warehouse',
        // eslint-disable-next-line camelcase
        data_connection_type_id: postgresqlConnectionTypeId,
        format: 'tabular',
        credentials: {
          secret: 'warehouse',
          properties: { URI: 'postgres://example' },
        },
        properties: {},
      });
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/ConnectionResponse/content/application~1json/schema',
        status: 201,
      });
    });
  });

  describe('Connection Endpoint', () => {
    it('should retrieve a connection for a project', async () => {
      const result = await apiClient.get(`/api/v1/connections/${connectionId}?namespace=default`);
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/ConnectionResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should return not found for an unknown connection', async () => {
      const result = await apiClient.get(
        `/api/v1/connections/${unknownResourceId}?namespace=default`,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect({ status: result.error.status, data: result.error.data }).toMatchContract(
          bffSchema,
          {
            ref: '#/components/responses/NotFound/content/application~1json/schema',
            status: 404,
          },
        );
      }
    });
  });

  describe('Test Credentials Endpoint', () => {
    it('should verify credentials for a connection type', async () => {
      const result = await apiClient.post('/api/v1/test/credentials?namespace=default', {
        // eslint-disable-next-line camelcase
        data_connection_type_id: postgresqlConnectionTypeId,
        credentials: { URI: 'postgres://example' },
      });
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/schemas/NoContent',
        status: 204,
      });
    });
  });

  describe('Connection Types Endpoint', () => {
    it('should retrieve connection types for a project', async () => {
      const result = await apiClient.get('/api/v1/connection-types?namespace=default');
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/ConnectionTypesResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Connection Type Endpoint', () => {
    it('should retrieve a connection type for a project', async () => {
      const result = await apiClient.get(
        `/api/v1/connection-types/${postgresqlConnectionTypeId}?namespace=default`,
      );
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/ConnectionTypeResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should return not found for an unknown connection type', async () => {
      const result = await apiClient.get(
        `/api/v1/connection-types/${unknownResourceId}?namespace=default`,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect({ status: result.error.status, data: result.error.data }).toMatchContract(
          bffSchema,
          {
            ref: '#/components/responses/NotFound/content/application~1json/schema',
            status: 404,
          },
        );
      }
    });

    it('should return bad request when namespace is missing', async () => {
      const result = await apiClient.get(`/api/v1/connection-types/${postgresqlConnectionTypeId}`);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect({ status: result.error.status, data: result.error.data }).toMatchContract(
          bffSchema,
          {
            ref: '#/components/responses/BadRequest/content/application~1json/schema',
            status: 400,
          },
        );
      }
    });
  });

  describe('Connection Readiness Endpoint', () => {
    it('should verify a connection', async () => {
      const result = await apiClient.post(
        `/api/v1/connections/${connectionId}/readiness?namespace=default`,
        {},
      );
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/schemas/NoContent',
        status: 204,
      });
    });
  });

  describe('Delete Connection Endpoint', () => {
    it('should delete a connection', async () => {
      const result = await apiClient.delete(
        `/api/v1/connections/${connectionId}?namespace=default`,
      );
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/schemas/NoContent',
        status: 204,
      });
    });
  });
});
