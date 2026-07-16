/**
 * @jest-environment node
 */
import {
  apiClient,
  unauthenticatedClient,
  restrictedClient,
  expectSuccess,
  expectError,
} from '../helpers';

describe('Core BFF Status - OpenShift Platform', () => {
  describe('Allowed Users', () => {
    it('should return 403 for non-admin', async () => {
      expectError(await restrictedClient.get('/api/status/opendatahub/allowedUsers'), 403);
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(await unauthenticatedClient.get('/api/status/opendatahub/allowedUsers'), 401);
    });

    it('should return an array for admin (empty when no notebooks)', async () => {
      const { response } = expectSuccess(
        await apiClient.get('/api/status/opendatahub/allowedUsers'),
      );
      expect(Array.isArray(response.data)).toBe(true);
    });
  });
});
