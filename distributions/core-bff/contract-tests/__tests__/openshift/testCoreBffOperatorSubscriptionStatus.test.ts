/**
 * @jest-environment node
 */
import {
  apiClient,
  unauthenticatedClient,
  apiSchema,
  expectError,
  expectSuccess,
} from '../helpers';

describe('Core BFF Operator Subscription Status - OpenShift Platform', () => {
  it('should return the operator channel', async () => {
    const result = await apiClient.get('/api/operator-subscription-status');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/OperatorSubscriptionStatusResponse/content/application/json/schema',
      status: 200,
    });
    const { response } = expectSuccess(result);
    expect(response.data).toHaveProperty('channel');
  });

  it('should return 401 when no auth token is provided', async () => {
    expectError(await unauthenticatedClient.get('/api/operator-subscription-status'), 401);
  });
});
