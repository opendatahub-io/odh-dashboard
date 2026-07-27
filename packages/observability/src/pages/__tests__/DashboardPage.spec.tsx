import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { DashboardResource } from '@perses-dev/core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import DashboardPage from '../DashboardPage';
import { usePersesDashboards } from '../../api/usePersesDashboards';

jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({
    emptyStatePage,
    emptyMessage,
    loaded,
    loadError,
    errorMessage,
  }: {
    emptyStatePage?: React.ReactNode;
    emptyMessage?: string;
    loaded?: boolean;
    loadError?: Error;
    errorMessage?: string;
  }) => {
    if (!loaded) {
      return <div data-testid="page-loading" />;
    }
    if (loadError) {
      return <div data-testid="page-error">{errorMessage}</div>;
    }
    if (emptyStatePage) {
      return <div>{emptyStatePage}</div>;
    }
    if (emptyMessage) {
      return <div data-testid="page-empty-message">{emptyMessage}</div>;
    }
    return null;
  },
}));

jest.mock('../ObservabilityNoProjects', () => ({
  __esModule: true,
  default: () => <div data-testid="observability-no-projects" />,
}));

jest.mock('../DashboardContent', () => ({
  __esModule: true,
  default: ({ dashboards }: { dashboards: DashboardResource[] }) => (
    <div data-testid="dashboard-content">{dashboards.map((d) => d.metadata.name).join(',')}</div>
  ),
}));

jest.mock('../../api/usePersesDashboards');

const usePersesDashboardsMock = jest.mocked(usePersesDashboards);

const createDashboard = (name: string, hasNamespace = false): DashboardResource =>
  ({
    metadata: { name },
    spec: {
      variables: hasNamespace ? [{ kind: 'ListVariable', spec: { name: 'namespace' } }] : [],
    },
  } as unknown as DashboardResource);

const namespaceDashboard = createDashboard('dashboard-1-model', true);
const clusterDashboard = createDashboard('dashboard-0-cluster-admin');
const mockProject = { metadata: { name: 'test-project' } } as ProjectKind;

const mockPerses = ({
  dashboards = [namespaceDashboard],
  loaded = true,
  error,
}: {
  dashboards?: DashboardResource[];
  loaded?: boolean;
  error?: Error;
} = {}) => {
  usePersesDashboardsMock.mockReturnValue({
    dashboards,
    loaded,
    error,
    refresh: jest.fn(),
  });
};

const renderPage = ({
  projects = [],
  loaded = true,
}: {
  projects?: ProjectKind[];
  loaded?: boolean;
} = {}) =>
  render(
    <ProjectsContext.Provider
      value={{
        projects,
        modelServingProjects: projects,
        nonActiveProjects: [],
        preferredProject: projects[0] ?? null,
        updatePreferredProject: () => undefined,
        waitForProject: () => Promise.resolve(),
        loaded,
        loadError: undefined,
      }}
    >
      <DashboardPage />
    </ProjectsContext.Provider>,
  );

describe('DashboardPage', () => {
  beforeEach(() => {
    mockPerses();
  });

  it('should show loading while dashboards are still loading', () => {
    mockPerses({ dashboards: [], loaded: false });
    renderPage({ projects: [mockProject] });

    expect(screen.getByTestId('page-loading')).toBeDefined();
  });

  it('should show loading while projects are still loading', () => {
    mockPerses({ dashboards: [clusterDashboard, namespaceDashboard] });
    renderPage({ loaded: false });

    expect(screen.getByTestId('page-loading')).toBeDefined();
  });

  it('should show dashboards load error', () => {
    // Matches useFetch: failed requests set error and leave loaded=false
    mockPerses({ dashboards: [], loaded: false, error: new Error('unavailable') });
    renderPage({ projects: [mockProject] });

    expect(screen.getByTestId('page-error').textContent).toBe(
      'Unable to reach observability dashboards',
    );
  });

  it('should show no projects when only namespace-scoped dashboards exist', () => {
    renderPage();

    expect(screen.getByTestId('observability-no-projects')).toBeDefined();
  });

  it('should render non-namespace dashboards when user has no projects', () => {
    mockPerses({ dashboards: [clusterDashboard, namespaceDashboard] });
    renderPage();

    expect(screen.getByTestId('dashboard-content').textContent).toBe('dashboard-0-cluster-admin');
  });

  it('should render all dashboards when projects exist', () => {
    mockPerses({ dashboards: [clusterDashboard, namespaceDashboard] });
    renderPage({ projects: [mockProject] });

    expect(screen.getByTestId('dashboard-content').textContent).toBe(
      'dashboard-0-cluster-admin,dashboard-1-model',
    );
  });

  it('should show no dashboards message when none are found', () => {
    mockPerses({ dashboards: [] });
    renderPage({ projects: [mockProject] });

    expect(screen.getByTestId('page-empty-message').textContent).toBe(
      'No dashboards were found. Verify that the monitoring stack is configured correctly.',
    );
  });

  it('should show no dashboards message when none are found and user has no projects', () => {
    mockPerses({ dashboards: [] });
    renderPage();

    expect(screen.getByTestId('page-empty-message')).toBeDefined();
    expect(screen.queryByTestId('observability-no-projects')).toBeNull();
  });
});
