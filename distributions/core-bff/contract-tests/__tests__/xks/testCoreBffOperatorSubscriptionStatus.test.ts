/**
 * @jest-environment node
 */
import { apiClient, expectError } from '../helpers';

describe('Core BFF Operator Subscription Status - XKS Platform', () => {
  it('should return 404', async () => {
    expectError(await apiClient.get('/api/operator-subscription-status'), 404);
  });
});
