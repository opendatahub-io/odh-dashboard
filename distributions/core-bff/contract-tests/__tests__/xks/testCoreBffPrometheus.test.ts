/**
 * @jest-environment node
 */
import { apiClient, expectError } from '../helpers';

describe('Core BFF Prometheus - XKS Platform', () => {
  const prometheusRoutes = ['query', 'queryRange', 'pvc', 'bias', 'serving'];

  describe.each(prometheusRoutes)('Prometheus %s POST', (route) => {
    it('should return 404 because Prometheus is OpenShift-only', async () => {
      expectError(await apiClient.post(`/api/prometheus/${route}`, { query: 'query=up' }), 404);
    });
  });
});
