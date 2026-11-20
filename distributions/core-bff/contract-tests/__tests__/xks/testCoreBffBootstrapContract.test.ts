/**
 * @jest-environment node
 *
 * xKS bootstrap: an authorized non-admin must get in with the agreed minimal
 * permissions, and configuration bootstrap must not write.
 * See distributions/core-bff/docs/bootstrap-contract.md.
 */
import { apiClient, restrictedClient, expectSuccess, expectError } from '../helpers';

describe('Core BFF bootstrap - XKS Platform', () => {
  it('admits an authorized non-admin without Auth-resource permissions', async () => {
    const { response } = expectSuccess(await restrictedClient.get('/api/status'));
    const { kube } = response.data as { kube: Record<string, unknown> };

    expect(kube.isAllowed).toBe(true);
    expect(kube.isAdmin).toBe(false);
    expect(kube.userName).toEqual(expect.any(String));
    expect(kube.userName).not.toBe('');
  });

  it('serves the configuration bootstrap to a non-admin', async () => {
    // The privileged read exists so a non-admin sees the real configuration
    // without being granted read access to the CR.
    const { response } = expectSuccess(await restrictedClient.get('/api/config'));
    expect(response.data).toHaveProperty('spec.dashboardConfig');
  });

  it('serves the component bootstrap to a non-admin even with no OdhApplications', async () => {
    const { response } = expectSuccess(await restrictedClient.get('/api/components'));
    expect(response.data).toEqual([]);
  });

  it('does not expose OpenShift-only bootstrap surfaces', async () => {
    // allowedUsers is gated by requirePlatform, so it is absent rather than
    // failing an xKS bootstrap that happens to poll it.
    expectError(await apiClient.get('/api/status/default/allowedUsers'), 404);
    expectError(await apiClient.get('/api/operator-subscription-status'), 404);
  });
});
