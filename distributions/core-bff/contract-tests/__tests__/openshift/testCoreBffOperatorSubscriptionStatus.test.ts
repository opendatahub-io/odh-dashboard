/**
 * @jest-environment node
 */
import {
  apiClient,
  unauthenticatedClient,
  restrictedClient,
  apiSchema,
  expectError,
  expectSuccess,
} from '../helpers';

describe('Core BFF Operator Subscription Status - OpenShift Platform', () => {
  it('should return the installed ODH subscription in openshift-operators for authenticated users', async () => {
    const namespace = 'openshift-operators';
    const subscriptionsPath = `/api/k8s/apis/operators.coreos.com/v1alpha1/namespaces/${namespace}/subscriptions`;
    expectSuccess(
      await apiClient.post('/api/k8s/api/v1/namespaces', {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: namespace },
      }),
    );
    try {
      expectSuccess(
        await apiClient.post(subscriptionsPath, {
          apiVersion: 'operators.coreos.com/v1alpha1',
          kind: 'Subscription',
          metadata: { name: 'opendatahub-operator', namespace },
          spec: { channel: 'fast' },
          status: {
            installedCSV: 'opendatahub-operator.v3.0.0',
            lastUpdated: '2026-09-25T12:00:00Z',
          },
        }),
      );
      for (const client of [apiClient, restrictedClient]) {
        const result = expectSuccess(await client.get('/api/operator-subscription-status'));
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/OperatorSubscriptionStatusResponse/content/application/json/schema',
          status: 200,
        });
        expect(result.response.data).toEqual({
          channel: 'fast',
          lastUpdated: '2026-09-25T12:00:00Z',
        });
      }
    } finally {
      await apiClient.delete(`${subscriptionsPath}/opendatahub-operator`);
      await apiClient.delete(`/api/k8s/api/v1/namespaces/${namespace}`);
    }
  });

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
