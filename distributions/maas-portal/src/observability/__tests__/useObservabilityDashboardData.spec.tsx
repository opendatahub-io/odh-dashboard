import { renderHook, waitFor } from '@testing-library/react';
import { PORTAL_BASE_PATH } from '../../portalPaths';
import { MAAS_USAGE_DASHBOARDS_PATH, PERSES_PROXY_BASE_PATH } from '../paths';
import { useObservabilityDashboardData } from '../useObservabilityDashboardData';

const userDashboard = {
  kind: 'Dashboard',
  metadata: { name: 'dashboard-5-maas-usage-logs', project: 'redhat-ods-monitoring' },
  spec: { panels: {}, layouts: [], variables: [] },
};

const adminDashboard = {
  kind: 'Dashboard',
  metadata: { name: 'dashboard-4-maas-usage-logs-admin', project: 'redhat-ods-monitoring' },
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

  it('should load only the dashboards returned by MaaS without Perses discovery or namespaces', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ data: [userDashboard] }));

    const { result } = renderHook(() => useObservabilityDashboardData());
    await waitFor(() => expect(result.current.dashboardsLoaded).toBe(true));

    expect(result.current.dashboards).toEqual([userDashboard]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      `${PORTAL_BASE_PATH}${MAAS_USAGE_DASHBOARDS_PATH}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      `${PERSES_PROXY_BASE_PATH}/api/v1/dashboards`,
      expect.anything(),
    );
  });

  it('should preserve both dashboards returned for an admin', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ data: [userDashboard, adminDashboard] }));

    const { result } = renderHook(() => useObservabilityDashboardData());
    await waitFor(() => expect(result.current.dashboardsLoaded).toBe(true));

    expect(result.current.dashboards).toEqual([userDashboard, adminDashboard]);
  });

  it.each([401, 403, 503])('should preserve dashboard request status %s', async (status) => {
    global.fetch = jest.fn().mockResolvedValue(response({}, status));

    const { result } = renderHook(() => useObservabilityDashboardData());
    await waitFor(() => expect(result.current.dashboardsError).toMatchObject({ status }));

    expect(result.current.dashboards).toEqual([]);
  });

  it('should reject malformed dashboard definitions', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(response({ data: [{ metadata: { name: 'unexpected' } }] }));

    const { result } = renderHook(() => useObservabilityDashboardData());
    await waitFor(() =>
      expect(result.current.dashboardsError?.message).toBe('Invalid response format'),
    );
  });
});
