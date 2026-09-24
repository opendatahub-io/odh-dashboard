import { renderHook, waitFor } from '@testing-library/react';
import { usePersesDashboards } from '@odh-dashboard/observability/dashboard';
import { PORTAL_BASE_PATH } from '../../portalPaths';
import { MAAS_NAMESPACES_PATH, PERSES_PROXY_BASE_PATH } from '../paths';
import { useObservabilityDashboardData } from '../useObservabilityDashboardData';

jest.mock('@odh-dashboard/observability/dashboard', () => ({
  usePersesDashboards: jest.fn(),
}));

const usePersesDashboardsMock = jest.mocked(usePersesDashboards);

describe('useObservabilityDashboardData', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    usePersesDashboardsMock.mockReturnValue({
      dashboards: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps MaaS namespaces and uses portal-prefixed MaaS and Perses requests', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ name: 'team-a', displayName: 'Team A' }, { name: 'team-b' }],
        }),
    } as Response);

    const { result } = renderHook(() => useObservabilityDashboardData());

    await waitFor(() =>
      expect(result.current.projects).toEqual([
        { name: 'team-a', label: 'Team A' },
        { name: 'team-b', label: 'team-b' },
      ]),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      `${PORTAL_BASE_PATH}${MAAS_NAMESPACES_PATH}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(usePersesDashboardsMock).toHaveBeenCalledWith({
      persesProxyBasePath: PERSES_PROXY_BASE_PATH,
    });
  });
});
