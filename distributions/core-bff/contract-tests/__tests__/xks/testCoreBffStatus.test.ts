/**
 * @jest-environment node
 */
import { apiClient, expectError } from '../helpers';

describe('Core BFF Status - XKS Platform', () => {
  describe('Allowed Users', () => {
    it('should return 404 because allowedUsers is OpenShift-only', async () => {
      expectError(await apiClient.get('/api/status/opendatahub/allowedUsers'), 404);
    });
  });
});
