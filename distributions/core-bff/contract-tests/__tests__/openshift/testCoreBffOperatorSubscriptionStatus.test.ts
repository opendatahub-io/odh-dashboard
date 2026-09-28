/**
 * @jest-environment node
 */
import { apiClient, unauthenticatedClient, apiSchema, expectError } from '../helpers';

describe('Core BFF Operator Subscription Status - OpenShift Platform', () => {
  it('should return 404 when the selected operator subscription is missing', async () => {
    const result = await apiClient.get('/api/operator-subscription-status');
    const error = expectError(result, 404);
    expect({ status: error.status, data: error.data, headers: error.headers }).toMatchContract(
      apiSchema,
      {
        ref: '#/components/schemas/ErrorResponse',
        status: 404,
      },
    );
    expect(error.data).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });

  it('should return 401 when no auth token is provided', async () => {
    expectError(await unauthenticatedClient.get('/api/operator-subscription-status'), 401);
  });
});
