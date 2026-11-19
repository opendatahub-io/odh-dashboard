/**
 * @jest-environment node
 *
 * OpenShift keeps its existing project selection; the xKS discovery routes are absent.
 */
import { apiClient, expectError } from '../helpers';

describe('Core BFF namespace access - OpenShift Platform', () => {
  it('does not expose the xKS namespace discovery', async () => {
    expectError(await apiClient.get('/api/v1/namespace-access'), 404);
    expectError(await apiClient.get('/api/v1/namespace-access/test-ns-a'), 404);
  });
});
