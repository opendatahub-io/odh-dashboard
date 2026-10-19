import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
});
