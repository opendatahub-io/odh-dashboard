import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { DashboardResource } from '@perses-dev/core';
import { MemoryRouter } from 'react-router-dom';
import DashboardContent from '../DashboardContent';

jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@patternfly/react-core', () => ({
  PageSection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tab: ({ href, title }: { href: string; title: React.ReactNode }) => <a href={href}>{title}</a>,
  Tabs: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TabTitleText: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../perses/embeddable/PersesProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../perses/embeddable/PersesDashboard', () => ({
  __esModule: true,
  default: () => null,
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

jest.mock('../../hooks/useRelativeLinkHandler', () => ({
  __esModule: true,
  default: () => () => undefined,
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
  it('keeps direct dashboard links under the host browser base path', () => {
    render(
      <MemoryRouter
        basename="/maas-consumer-portal"
        initialEntries={['/maas-consumer-portal/observe-and-monitor/dashboard?start=30m&end=now']}
      >
        <DashboardContent
          dashboards={[dashboard]}
          projectNames={[]}
          persesProxyBasePath="/maas-consumer-portal/perses/api"
          routeBasePath="/observe-and-monitor/dashboard"
          browserBasePath="/maas-consumer-portal"
          ClusterDetailsAdapter={() => null}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Models' }).getAttribute('href')).toBe(
      '/maas-consumer-portal/observe-and-monitor/dashboard?start=30m&end=now&dashboard=dashboard-1-model',
    );
  });
});
