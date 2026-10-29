import { renderHook, waitFor } from '@testing-library/react';
import { PORTAL_BASE_PATH } from '../../portalPaths';
import { MAAS_NAMESPACES_PATH, MAAS_USAGE_DASHBOARDS_PATH } from '../paths';
import { useObservabilityDashboardData } from '../useObservabilityDashboardData';

const userDashboard = {
  kind: 'Dashboard',
  metadata: { name: 'dashboard-5-maas-usage-logs', project: 'redhat-ods-monitoring' },
  spec: { panels: {}, layouts: [], variables: [] },
};

const response = (data: unknown, status = 200) => ({
  ok: status === 200,
  status,
  json: async () => data,
  headers: new Headers(),
});

describe('useObservabilityDashboardData', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should load only the dashboard resources returned by MaaS and map projects', async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(async (url) =>
        response(
          url === `${PORTAL_BASE_PATH}${MAAS_NAMESPACES_PATH}`
            ? { data: [{ name: 'team-a', displayName: 'Team A' }, { name: 'team-b' }] }
            : { data: [userDashboard] },
        ),
      );

    const { result } = renderHook(() => useObservabilityDashboardData());
    await waitFor(() => expect(result.current.dashboardsLoaded).toBe(true));
    expect(result.current.dashboards).toEqual([userDashboard]);
    expect(result.current.projects).toEqual([
      { name: 'team-a', label: 'Team A' },
      { name: 'team-b', label: 'team-b' },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      `${PORTAL_BASE_PATH}${MAAS_USAGE_DASHBOARDS_PATH}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      `${PORTAL_BASE_PATH}/perses/api/api/v1/dashboards`,
      expect.anything(),
    );
  });

  it.each([401, 403, 503])('should preserve dashboard request status %s', async (status) => {
    global.fetch = jest
      .fn()
      .mockImplementation(async (url) =>
        url === `${PORTAL_BASE_PATH}${MAAS_NAMESPACES_PATH}`
          ? response({ data: [] })
          : response({}, status),
      );
    const { result } = renderHook(() => useObservabilityDashboardData());
    await waitFor(() => expect(result.current.dashboardsError).toMatchObject({ status }));
    expect(result.current.dashboards).toEqual([]);
  });

  it('should reject malformed dashboard definitions', async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(async (url) =>
        url === `${PORTAL_BASE_PATH}${MAAS_NAMESPACES_PATH}`
          ? response({ data: [] })
          : response({ data: [{ metadata: { name: 'unexpected' } }] }),
      );
    const { result } = renderHook(() => useObservabilityDashboardData());
    await waitFor(() =>
      expect(result.current.dashboardsError?.message).toBe('Invalid response format'),
    );
  });
});
