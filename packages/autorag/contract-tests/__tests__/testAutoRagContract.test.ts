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

  // Load the AutoRAG OpenAPI schema
  const apiSchema = loadOpenAPISchema('../api/openapi/autorag.yaml');

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

  describe('Secrets Endpoint', () => {
    describe('Success Cases', () => {
      it('should retrieve all secrets when no type filter is specified', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should retrieve storage secrets when type=storage', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&type=storage');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should retrieve lls secrets when type=lls', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&type=lls');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should handle lls type filter with pagination', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&type=lls&limit=5');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should validate SecretListItem schema structure', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });
    });

    describe('Pagination', () => {
      it('should handle pagination with limit parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=10');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should handle pagination with offset parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&offset=5');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should handle pagination with both limit and offset', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=5&offset=2');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should return 400 for limit=0', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=0');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return default limit of 10 when no limit specified', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should handle limit=100 (maximum allowed)', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=100');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should handle offset beyond available data', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&offset=99999');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });
    });

    describe('Error Cases', () => {
      it('should return 400 when resource parameter is missing', async () => {
        const result = await apiClient.get('/api/v1/secrets');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for invalid type parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&type=invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for invalid limit parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for negative limit parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=-1');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for invalid offset parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&offset=invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for negative offset parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&offset=-1');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for limit exceeding maximum (101)', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=101');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for limit exceeding maximum (999)', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=999');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty namespace', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for non-existent namespace', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=non-existent-namespace-12345');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });
  });
});
