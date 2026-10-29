import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { PluginStore } from '@odh-dashboard/plugin-core';
import HostApiProvider from '../../providers/HostApiProvider';
import { PORTAL_BASE_PATH } from '../../portalPaths';
import { GRID } from '../../featureFlags';
import { MAAS_NAMESPACES_PATH, MAAS_USAGE_DASHBOARDS_PATH, PERSES_PROXY_BASE_PATH } from '../paths';
import { useObservabilityDashboardData } from '../useObservabilityDashboardData';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sCreateResource: jest.fn(),
}));

const userDashboard = {
  kind: 'Dashboard',
  metadata: { name: 'dashboard-5-maas-usage-logs', project: 'redhat-ods-monitoring' },
  spec: { panels: {}, layouts: [], variables: [] },
};

const adminDashboard = {
  kind: 'Dashboard',
  metadata: { name: 'dashboard-5-maas-usage-logs-admin', project: 'redhat-ods-monitoring' },
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
  let store: PluginStore;

  const renderData = () =>
    renderHook(() => useObservabilityDashboardData(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PluginStoreProvider store={store}>
          <HostApiProvider>{children}</HostApiProvider>
        </PluginStoreProvider>
      ),
    });

  beforeEach(() => {
    originalFetch = global.fetch;
    store = new PluginStore({});
    jest.clearAllMocks();
    jest.mocked(k8sCreateResource).mockResolvedValue({ status: { allowed: false } });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should use the original Perses dashboard list and map projects when grid is off', async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(async (url) =>
        response(
          url === `${PORTAL_BASE_PATH}${MAAS_NAMESPACES_PATH}`
            ? { data: [{ name: 'team-a', displayName: 'Team A' }, { name: 'team-b' }] }
            : [userDashboard, adminDashboard],
        ),
      );

    const { result } = renderData();
    await waitFor(() => expect(result.current.dashboardsLoaded).toBe(true));
    expect(result.current.dashboards).toEqual([userDashboard]);
    expect(result.current.projects).toEqual([
      { name: 'team-a', label: 'Team A' },
      { name: 'team-b', label: 'team-b' },
    ]);
    expect(result.current.requireProjectsForNamespaceDashboards).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      `${PERSES_PROXY_BASE_PATH}/api/v1/dashboards`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      `${PORTAL_BASE_PATH}${MAAS_NAMESPACES_PATH}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      `${PORTAL_BASE_PATH}${MAAS_USAGE_DASHBOARDS_PATH}`,
      expect.anything(),
    );
    expect(k8sCreateResource).toHaveBeenCalledTimes(1);
  });

  it('should skip the namespaces request and allow dashboards without projects in grid mode', async () => {
    store.setFeatureFlags({ [GRID]: true });
    global.fetch = jest.fn().mockResolvedValue(response({ data: [userDashboard] }));

    const { result } = renderData();
    await waitFor(() => expect(result.current.dashboardsLoaded).toBe(true));
    expect(result.current.projectsLoaded).toBe(true);
    expect(result.current.projects).toEqual([]);
    expect(result.current.projectsLoadError).toBeUndefined();
    expect(result.current.requireProjectsForNamespaceDashboards).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      `${PORTAL_BASE_PATH}${MAAS_USAGE_DASHBOARDS_PATH}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(k8sCreateResource).not.toHaveBeenCalled();
  });

  it.each([401, 403, 503])('should preserve dashboard request status %s', async (status) => {
    store.setFeatureFlags({ [GRID]: true });
    global.fetch = jest.fn().mockResolvedValue(response({}, status));
    const { result } = renderData();
    await waitFor(() => expect(result.current.dashboardsError).toMatchObject({ status }));
    expect(result.current.dashboards).toEqual([]);
  });

  it('should reject malformed dashboard definitions', async () => {
    store.setFeatureFlags({ [GRID]: true });
    global.fetch = jest
      .fn()
      .mockResolvedValue(response({ data: [{ metadata: { name: 'unexpected' } }] }));
    const { result } = renderData();
    await waitFor(() =>
      expect(result.current.dashboardsError?.message).toBe('Invalid response format'),
    );
  });
});
