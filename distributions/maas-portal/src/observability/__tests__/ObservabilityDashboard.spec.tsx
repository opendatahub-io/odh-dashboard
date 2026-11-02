import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useHref, useLocation, useNavigate } from 'react-router-dom';
import type { DashboardResource } from '@perses-dev/core';
import ObservabilityDashboard from '../ObservabilityDashboard';
import { useObservabilityDashboardData } from '../useObservabilityDashboardData';
import { PORTAL_BASE_PATH } from '../../portalPaths';

jest.mock('@odh-dashboard/observability/embeddable', () => ({
  PersesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PersesDashboard: () => null,
  PersesTimeControls: () => null,
  PersesVariables: () => null,
}));
jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: jest.requireActual(
    '../../../../../packages/ui-core/src/components/ApplicationsPage',
  ).default,
}));
jest.mock('../useObservabilityDashboardData', () => ({ useObservabilityDashboardData: jest.fn() }));

const dataMock = jest.mocked(useObservabilityDashboardData);
const dashboard = (name: string, title: string): DashboardResource => ({
  kind: 'Dashboard',
  metadata: { name, project: 'redhat-ods-monitoring', createdAt: '', updatedAt: '', version: 0 },
  spec: {
    display: { name: title },
    datasources: {},
    panels: {},
    layouts: [],
    duration: '30m',
    variables: [],
  },
});

const renderDashboard = () => {
  const Location = () => {
    const location = useLocation();
    const navigate = useNavigate();
    return (
      <>
        <output data-testid="location">{useHref(location)}</output>
        <button onClick={() => navigate(-1)}>Back</button>
      </>
    );
  };
  render(
    <MemoryRouter
      basename={PORTAL_BASE_PATH}
      initialEntries={[
        `${PORTAL_BASE_PATH}/landing`,
        `${PORTAL_BASE_PATH}/observe-and-monitor/dashboard?start=30m&end=now`,
      ]}
    >
      <Location />
      <ObservabilityDashboard />
    </MemoryRouter>,
  );
};

describe('ObservabilityDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dataMock.mockReturnValue({ dashboards: [], dashboardsLoaded: true });
  });

  it('should navigate between BFF-approved dashboards and preserve the portal URL', async () => {
    dataMock.mockReturnValue({
      dashboards: [dashboard('dashboard-a', 'My Usage'), dashboard('dashboard-b', 'Usage')],
      dashboardsLoaded: true,
    });
    renderDashboard();

    const tab = screen.getByRole('tab', { name: 'Usage' });
    expect(tab).toHaveAttribute(
      'href',
      `${PORTAL_BASE_PATH}/observe-and-monitor/dashboard?start=30m&end=now&dashboard=dashboard-b`,
    );
    fireEvent.click(tab);
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        `${PORTAL_BASE_PATH}/observe-and-monitor/dashboard?start=30m&end=now&dashboard=dashboard-b`,
      ),
    );
    expect(screen.getByRole('tab', { name: 'Usage' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location')).toHaveTextContent(`${PORTAL_BASE_PATH}/landing`);
  });

  it('should show one tab for a user dashboard', () => {
    dataMock.mockReturnValue({
      dashboards: [dashboard('dashboard-5-maas-usage-logs', 'My Usage')],
      dashboardsLoaded: true,
    });
    renderDashboard();
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getByRole('tab', { name: 'My Usage' })).toBeInTheDocument();
  });

  it.each([
    [401, 'portal-observability-access-denied'],
    [403, 'portal-observability-access-denied'],
    [503, 'portal-observability-unavailable'],
  ])('should display the correct error page for status %s', (status, testId) => {
    dataMock.mockReturnValue({
      dashboards: [],
      dashboardsLoaded: true,
      dashboardsError: Object.assign(new Error('request failed'), { status }),
    });
    renderDashboard();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('should show an empty state when MaaS returns no dashboards', () => {
    renderDashboard();
    expect(screen.getByText('No usage dashboards were found.')).toBeInTheDocument();
  });

  it('should wait for the BFF response before rendering tabs', () => {
    dataMock.mockReturnValue({ dashboards: [], dashboardsLoaded: false });
    renderDashboard();
    expect(screen.queryByTestId('observability-dashboard-tabs')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
