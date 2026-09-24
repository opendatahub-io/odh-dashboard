import * as React from 'react';
import { render } from '@testing-library/react';
import { DashboardView } from '@odh-dashboard/observability/dashboard';
import ObservabilityDashboard from '../ObservabilityDashboard';
import { DASHBOARD_ROUTE, PERSES_PROXY_BASE_PATH } from '../paths';
import { useObservabilityDashboardData } from '../useObservabilityDashboardData';
import { PORTAL_BASE_PATH } from '../../portalPaths';

jest.mock('@odh-dashboard/observability/dashboard', () => ({
  DashboardView: jest.fn(() => null),
}));

jest.mock('../useObservabilityDashboardData', () => ({
  useObservabilityDashboardData: jest.fn(),
}));

const DashboardViewMock = jest.mocked(DashboardView);
const useObservabilityDashboardDataMock = jest.mocked(useObservabilityDashboardData);

describe('ObservabilityDashboard', () => {
  beforeEach(() => {
    DashboardViewMock.mockClear();
    useObservabilityDashboardDataMock.mockReturnValue({
      dashboards: [],
      dashboardsLoaded: true,
      projects: [],
      projectsLoaded: true,
    });
  });

  it('provides portal-prefixed paths for Perses requests and dashboard links', () => {
    render(<ObservabilityDashboard />);

    expect(DashboardViewMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        persesProxyBasePath: PERSES_PROXY_BASE_PATH,
        routeBasePath: DASHBOARD_ROUTE,
        browserBasePath: PORTAL_BASE_PATH,
      }),
    );
  });
});
