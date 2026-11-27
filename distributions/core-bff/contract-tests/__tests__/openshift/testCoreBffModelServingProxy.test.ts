/**
 * @jest-environment node
 */
import { apiClient, unauthenticatedClient, expectError, expectSuccess } from '../helpers';

// The model-serving-api proxy exists only on OpenShift. On xKS the BFF serves
// gateway discovery natively and registers no proxy (RHAI-50760); see
// xks/testCoreBffModelServingGateways.test.ts.
describe('Core BFF Model Serving - OpenShift Platform', () => {
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

  it('should proxy gateway discovery instead of serving it natively', async () => {
    const result = expectSuccess(
      await apiClient.get('/api/service/model-serving/api/v1/gateways?namespace=test-ns-a'),
    );
    expect(result.response.data).toEqual({ mock: true });
  });
});
