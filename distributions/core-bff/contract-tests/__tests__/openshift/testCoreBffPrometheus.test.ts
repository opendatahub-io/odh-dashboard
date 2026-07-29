/**
 * @jest-environment node
 */
import { apiClient, unauthenticatedClient, apiSchema, expectError } from '../helpers';

describe('Core BFF Prometheus - OpenShift Platform', () => {
  const prometheusRoutes = ['query', 'queryRange', 'pvc', 'bias', 'serving'];

  describe.each(prometheusRoutes)('Prometheus %s POST', (route) => {
    it('should return 400 for empty query', async () => {
      expectError(await apiClient.post(`/api/prometheus/${route}`, { query: '' }), 400);
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(
        await unauthenticatedClient.post(`/api/prometheus/${route}`, { query: 'query=up' }),
        401,
      );
    });

    it('should return 200 with PrometheusQueryResponse schema', async () => {
      const result = await apiClient.post(`/api/prometheus/${route}`, { query: 'query=up' });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/PrometheusQueryResponse',
        status: 200,
      });
    });
  });
});
