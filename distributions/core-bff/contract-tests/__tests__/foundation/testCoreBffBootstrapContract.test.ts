/**
 * @jest-environment node
 *
 * Bootstrap contract guarantees that hold on every platform.
 * See distributions/core-bff/docs/bootstrap-contract.md.
 */
import { apiClient, restrictedClient, expectSuccess } from '../helpers';

const BOOTSTRAP_PATHS = ['/api/status', '/api/config', '/api/components'];

const headerValues = (headers: unknown, name: string): string[] => {
  const record = headers as Record<string, string | string[] | undefined>;
  const raw = record[name] ?? record[name.toLowerCase()];
  if (raw === undefined) {
    return [];
  }
  return (Array.isArray(raw) ? raw : raw.split(',')).map((v) => v.trim().toLowerCase());
};

describe('Core BFF bootstrap contract', () => {
  describe('Authenticated responses are never shared between callers', () => {
    it.each(BOOTSTRAP_PATHS)('%s forbids storage and varies on identity', async (path) => {
      const { response } = expectSuccess(await apiClient.get(path));

      const cacheControl = String(
        (response.headers as Record<string, string>)['cache-control'] ?? '',
      ).toLowerCase();
      expect(cacheControl).toContain('no-store');
      expect(cacheControl).toContain('private');

      const vary = headerValues(response.headers, 'vary');
      expect(vary).toContain('authorization');
      expect(vary).toContain('x-forwarded-access-token');
      expect(vary).toContain('cookie');
    });
  });

  describe('Bootstrap responses carry only what the frontend needs', () => {
    it('does not leak the caller token, group lists or raw access configuration', async () => {
      const { response } = expectSuccess(await apiClient.get('/api/status'));
      const body = response.data as { kube: Record<string, unknown> };

      // The caller's own token must never be echoed back.
      expect(JSON.stringify(body)).not.toContain('FAKE_CLUSTER_ADMIN_TOKEN');

      // Identity, namespace, cluster metadata and the two capability flags only.
      expect(Object.keys(body)).toEqual(['kube']);
      for (const leaked of ['token', 'groups', 'adminGroups', 'allowedGroups']) {
        expect(body.kube).not.toHaveProperty(leaked);
      }
      expect(body.kube.currentUser).not.toHaveProperty('token');
    });

    it('reports admission and UI capability as separate booleans', async () => {
      const { response } = expectSuccess(await apiClient.get('/api/status'));
      const { kube } = response.data as { kube: Record<string, unknown> };

      expect(typeof kube.isAllowed).toBe('boolean');
      expect(typeof kube.isAdmin).toBe('boolean');
    });
  });

  describe('Admission and UI capability do not authorize API operations', () => {
    it('a non-admin who is admitted is still rejected by an admin-only route', async () => {
      const { response } = expectSuccess(await restrictedClient.get('/api/status'));
      const { kube } = response.data as { kube: Record<string, boolean> };

      expect(kube.isAdmin).toBe(false);

      // Admitted or not, the guarded route runs its own review and refuses.
      const guarded = await restrictedClient.get('/api/cluster-settings');
      expect(guarded.success).toBe(false);
    });
  });
});
