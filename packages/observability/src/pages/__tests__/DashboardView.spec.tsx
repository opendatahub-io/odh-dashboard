import * as React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardView from '../DashboardView';

jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({
    loadErrorPage,
    errorMessage,
  }: {
    loadErrorPage?: React.ReactNode;
    errorMessage?: string;
  }) => (
    <div>
      {loadErrorPage}
      {errorMessage}
    </div>
  ),
}));

jest.mock('../DashboardContent', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../ObservabilityNoProjects', () => ({
  __esModule: true,
  default: () => null,
}));

describe('DashboardView', () => {
  it('should render the host error page when dashboard discovery fails', () => {
    render(
      <DashboardView
        dashboards={[]}
        dashboardsLoaded={false}
        dashboardsError={new Error('not found')}
        dashboardsLoadErrorPage={<div data-testid="host-dashboard-error">Unavailable</div>}
        projects={[]}
        projectsLoaded
        ClusterDetailsAdapter={() => null}
      />,
    );

    expect(screen.getByTestId('host-dashboard-error')).toBeDefined();
  });

  it('should render the host forbidden page when dashboard discovery is denied', () => {
    render(
      <DashboardView
        dashboards={[]}
        dashboardsLoaded={false}
        dashboardsError={Object.assign(new Error('Forbidden'), { status: 403 })}
        dashboardsLoadErrorPage={<div data-testid="host-dashboard-error">Unavailable</div>}
        dashboardsForbiddenErrorPage={<div data-testid="host-dashboard-forbidden">Denied</div>}
        projects={[]}
        projectsLoaded
        ClusterDetailsAdapter={() => null}
      />,
    );

    expect(screen.getByTestId('host-dashboard-forbidden')).toBeDefined();
  });

  it('should render the host unavailable page when dashboard discovery times out', () => {
    render(
      <DashboardView
        dashboards={[]}
        dashboardsLoaded={false}
        dashboardsError={new Error('request timed out')}
        dashboardsLoadErrorPage={<div data-testid="host-dashboard-error">Unavailable</div>}
        dashboardsForbiddenErrorPage={<div data-testid="host-dashboard-forbidden">Denied</div>}
        projects={[]}
        projectsLoaded
        ClusterDetailsAdapter={() => null}
      />,
    );

    expect(screen.getByTestId('host-dashboard-error')).toBeDefined();
    expect(screen.queryByTestId('host-dashboard-forbidden')).toBeNull();
  });

  it('should render the host forbidden page when loading projects is denied', () => {
    render(
      <DashboardView
        dashboards={[]}
        dashboardsLoaded
        projects={[]}
        projectsLoaded={false}
        projectsLoadError={Object.assign(new Error('Forbidden'), { status: 403 })}
        projectsForbiddenErrorPage={<div data-testid="host-projects-forbidden">Denied</div>}
        ClusterDetailsAdapter={() => null}
      />,
    );

    expect(screen.getByTestId('host-projects-forbidden')).toBeDefined();
    expect(screen.getByText('Unable to load projects')).toBeDefined();
  });
});
