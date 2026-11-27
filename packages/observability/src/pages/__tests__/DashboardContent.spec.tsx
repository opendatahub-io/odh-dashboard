import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DashboardResource } from '@perses-dev/core';
import { MemoryRouter, useLocation } from 'react-router-dom';
import DashboardContent from '../DashboardContent';

jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@patternfly/react-core', () => ({
  PageSection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tab: ({
    href,
    title,
    children,
  }: {
    href: string;
    title: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <>
      <a href={href}>{title}</a>
      <div>{children}</div>
    </>
  ),
  Tabs: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TabTitleText: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../perses/embeddable/PersesProvider', () => ({
  __esModule: true,
  default: ({
    children,
    dashboardResource,
  }: {
    children: React.ReactNode;
    dashboardResource: { metadata: { name: string } };
  }) => (
    <div data-testid="perses-provider" data-dashboard={dashboardResource.metadata.name}>
      {children}
    </div>
  ),
  PersesDashboardGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../perses/embeddable/PersesDashboard', () => ({
  __esModule: true,
  default: () => (
    <a href="/custom-base/observe-and-monitor/dashboard?dashboard=dashboard-1-model">Panel link</a>
  ),
}));

jest.mock('../../perses/embeddable/PersesVariables', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../HeaderTimeRangeControls', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../NamespaceUrlSync', () => ({
  __esModule: true,
  default: () => null,
}));

const dashboard = {
  kind: 'Dashboard',
  metadata: {
    name: 'dashboard-1-model',
    project: 'default',
    createdAt: '',
    updatedAt: '',
    version: 0,
  },
  spec: {
    display: { name: 'Models' },
    datasources: {},
    variables: [],
    panels: {},
    layouts: [],
    duration: '30m',
  },
} satisfies DashboardResource;

describe('DashboardContent', () => {
  const CurrentLocation: React.FC = () => {
    const location = useLocation();
    return (
      <div data-testid="current-location">
        {location.pathname}
        {location.search}
      </div>
    );
  };

  it('keeps direct dashboard links under the host browser base path', () => {
    render(
      <MemoryRouter
        basename="/custom-base"
        initialEntries={['/custom-base/observe-and-monitor/dashboard?start=30m&end=now']}
      >
        <DashboardContent
          dashboards={[dashboard]}
          projects={[]}
          persesProxyBasePath="/custom-base/perses/api"
          browserBasePath="/custom-base"
          ClusterDetailsAdapter={() => null}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Models' }).getAttribute('href')).toBe(
      '/custom-base/observe-and-monitor/dashboard?start=30m&end=now&dashboard=dashboard-1-model',
    );
  });

  it('navigates panel links without duplicating the router basename', () => {
    render(
      <MemoryRouter
        basename="/custom-base"
        initialEntries={['/custom-base/observe-and-monitor/dashboard']}
      >
        <CurrentLocation />
        <DashboardContent
          dashboards={[dashboard]}
          projects={[]}
          browserBasePath="/custom-base"
          ClusterDetailsAdapter={() => null}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Panel link' }));

    expect(screen.getByTestId('current-location').textContent).toBe(
      '/observe-and-monitor/dashboard?dashboard=dashboard-1-model',
    );
  });

  it('re-asserts the dashboard param so a refresh keeps the selected tab', async () => {
    // Perses syncToUrl rewrites the query string without `dashboard=`; the
    // component must write it back (setSearchParams, not navigate).
    render(
      <MemoryRouter
        basename="/custom-base"
        initialEntries={['/custom-base/observe-and-monitor/dashboard?start=30m&end=now']}
      >
        <CurrentLocation />
        <DashboardContent
          dashboards={[dashboard]}
          projects={[]}
          browserBasePath="/custom-base"
          ClusterDetailsAdapter={() => null}
        />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('current-location').textContent).toBe(
        '/observe-and-monitor/dashboard?start=30m&end=now&dashboard=dashboard-1-model',
      ),
    );
  });

  it('selects the tab from the URL dashboard param', () => {
    const secondDashboard = {
      ...dashboard,
      metadata: { ...dashboard.metadata, name: 'dashboard-2-usage' },
      spec: { ...dashboard.spec, display: { name: 'Usage' } },
    };
    render(
      <MemoryRouter
        basename="/custom-base"
        initialEntries={['/custom-base/observe-and-monitor/dashboard?dashboard=dashboard-2-usage']}
      >
        <DashboardContent
          dashboards={[dashboard, secondDashboard]}
          projects={[]}
          browserBasePath="/custom-base"
          ClusterDetailsAdapter={() => null}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('perses-provider').getAttribute('data-dashboard')).toBe(
      'dashboard-2-usage',
    );
  });
});
