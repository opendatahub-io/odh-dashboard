/**
 * @jest-environment node
 */
import {
  apiClient,
  unauthenticatedClient,
  restrictedClient,
  apiSchema,
  expectSuccess,
  expectError,
} from '../helpers';

describe('Core BFF Status Endpoints', () => {
  describe('Status Endpoint', () => {
    it('should return user session status', async () => {
      const result = await apiClient.get('/api/status');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/StatusResponse/content/application/json/schema',
        status: 200,
      });
      const { response } = expectSuccess(result);
      const body = response.data as { kube: Record<string, unknown> };
      expect(body.kube).toHaveProperty('userName');
      expect(body.kube).toHaveProperty('isAdmin');
      expect(body.kube).toHaveProperty('isAllowed');
      expect(body.kube).toHaveProperty('clusterBranding');
      expect(body.kube).toHaveProperty('currentContext');
      expect(body.kube).toHaveProperty('currentUser');
      expect(body.kube.currentUser).toHaveProperty('name');
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(await unauthenticatedClient.get('/api/status'), 401);
    });

    it('should return status for non-admin authenticated user', async () => {
      const { response } = expectSuccess(await restrictedClient.get('/api/status'));
      const body = response.data as { kube: Record<string, unknown> };
      expect(body.kube).toHaveProperty('userName');
    });
  });

  describe('Allowed Users', () => {
    it('should return 401 for non-admin', async () => {
      expectError(await restrictedClient.get('/api/status/opendatahub/allowedUsers'), 401);
    });

    it('should return an array for admin (empty when no notebooks)', async () => {
      const { response } = expectSuccess(
        await apiClient.get('/api/status/opendatahub/allowedUsers'),
      );
      expect(Array.isArray(response.data)).toBe(true);
    });
  });
});
