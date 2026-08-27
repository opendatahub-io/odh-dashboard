/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

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
});
