import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useHref, useLocation, useNavigate } from 'react-router-dom';
import type { DashboardResource } from '@perses-dev/core';
import ObservabilityDashboard from '../ObservabilityDashboard';
import { useObservabilityDashboardData } from '../useObservabilityDashboardData';
import { PORTAL_BASE_PATH } from '../../portalPaths';

// Keep the real shared dashboard, PatternFly tabs, and router. Only the chart
// engine and its controls are replaced; they require a live Perses plugin server.
jest.mock('../../../../../packages/observability/src/perses/embeddable/PersesProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../../../../packages/observability/src/perses/embeddable/PersesDashboard', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../../../../packages/observability/src/perses/embeddable/PersesVariables', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../../../../packages/observability/src/pages/HeaderTimeRangeControls', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../../../../packages/observability/src/pages/NamespaceUrlSync', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: jest.requireActual(
    '../../../../../packages/ui-core/src/components/ApplicationsPage',
  ).default,
}));
jest.mock('../useObservabilityDashboardData', () => ({ useObservabilityDashboardData: jest.fn() }));

const dataMock = jest.mocked(useObservabilityDashboardData);
const dashboard = (name: string, title: string, needsProjects = false): DashboardResource => ({
  kind: 'Dashboard',
  metadata: { name, project: 'default', createdAt: '', updatedAt: '', version: 0 },
  spec: {
    display: { name: title },
    datasources: {},
    panels: {},
    layouts: [],
    duration: '30m',
    variables: needsProjects
      ? [{ kind: 'TextVariable', spec: { name: 'namespace', value: 'team-a' } }]
      : [],
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
    dataMock.mockReturnValue({
      dashboards: [],
      dashboardsLoaded: true,
      projects: [],
      projectsLoaded: true,
    });
  });

  it('should navigate between dashboards and preserve portal paths and time range', async () => {
    dataMock.mockReturnValue({
      dashboards: [dashboard('dashboard-a', 'Cluster'), dashboard('dashboard-b', 'Models')],
      dashboardsLoaded: true,
      projects: [],
      projectsLoaded: true,
    });
    renderDashboard();
    const tab = screen.getByRole('tab', { name: 'Models' });
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
    expect(screen.getByRole('tab', { name: 'Models' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location')).toHaveTextContent(`${PORTAL_BASE_PATH}/landing`);
  });

  it.each([
    ['dashboardsError', 403, 'portal-observability-access-denied'],
    ['projectsLoadError', 403, 'portal-observability-projects-access-denied'],
    ['dashboardsError', 503, 'portal-observability-unavailable'],
    ['projectsLoadError', 503, 'portal-observability-unavailable'],
  ])('should display the correct error page for %s with status %s', (field, status, testId) => {
    dataMock.mockReturnValue({
      dashboards: [],
      dashboardsLoaded: true,
      projects: [],
      projectsLoaded: true,
      [field]: Object.assign(new Error('request failed'), { status }),
    });
    renderDashboard();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('should ask for project access when only project dashboards exist', () => {
    dataMock.mockReturnValue({
      dashboards: [dashboard('dashboard-models', 'Models', true)],
      dashboardsLoaded: true,
      projects: [],
      projectsLoaded: true,
    });
    renderDashboard();
    expect(screen.getByTestId('portal-no-projects')).toHaveTextContent(
      'ask for access to a project',
    );
    expect(screen.queryByTestId('observability-dashboard-tabs')).not.toBeInTheDocument();
  });

  it('should wait for projects before rendering dashboards', () => {
    dataMock.mockReturnValue({
      dashboards: [dashboard('dashboard-models', 'Models', true)],
      dashboardsLoaded: true,
      projects: [],
      projectsLoaded: false,
    });
    renderDashboard();
    expect(screen.queryByTestId('observability-dashboard-tabs')).not.toBeInTheDocument();
    expect(screen.queryByTestId('portal-no-projects')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
