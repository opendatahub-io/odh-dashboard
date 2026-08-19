import * as React from 'react';
import { act } from 'react';
import { render, screen } from '@testing-library/react';
// MlflowBreadcrumbs renders react-router-dom's <Link>, which needs a Router
// context -- this import resolves through the mock below, which spreads the
// real module, so MemoryRouter/Routes/Route here are the genuine implementation.
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import MlflowMcpRegistryDetailPage from '../MlflowMcpRegistryDetailPage';
import { MCP_REGISTRY_BASENAME } from '../const';

const mockSyncHostRoute = jest.fn();
jest.mock('../useHostRouteSync', () => ({
  __esModule: true,
  default: () => mockSyncHostRoute,
}));

jest.mock('../api', () => ({
  createMcpAccessEndpoint: jest.fn(),
}));

jest.mock('../buildMcpAccessEndpointUrl', () => ({
  buildMcpAccessEndpointUrl: jest.fn(() => 'http://mock-endpoint'),
}));

jest.mock('@odh-dashboard/ui-core/contexts/NotificationContext', () => ({
  useNotification: () => ({ success: jest.fn(), warning: jest.fn(), error: jest.fn() }),
}));

let mockSearchParams = new URLSearchParams();
const mockNavigateEl = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useSearchParams: () => [mockSearchParams],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Navigate: (props: any) => {
    mockNavigateEl(props);
    return <div data-testid="navigate" />;
  },
}));

jest.mock('@module-federation/runtime', () => ({ loadRemote: jest.fn() }));

type LazyCodeRefProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: { basename: string; onBreadcrumbChange: (segments: any[]) => void };
};
let capturedWrapperProps: LazyCodeRefProps['props'] | undefined;
jest.mock('@odh-dashboard/plugin-core', () => ({
  LazyCodeRefComponent: (p: LazyCodeRefProps) => {
    capturedWrapperProps = p.props;
    return <div data-testid="lazy-wrapper" />;
  },
  useExtensions: () => [],
}));

jest.mock('@odh-dashboard/plugin-core/extension-points', () => ({
  isActionExtension: () => true,
}));

jest.mock('@odh-dashboard/plugin-core/helpers/ui', () => ({
  ExtensibleActions: () => <div data-testid="extensible-actions" />,
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ApplicationsPage: ({
    breadcrumb,
    children,
  }: {
    breadcrumb?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="breadcrumb-slot">{breadcrumb}</div>
      {children}
    </div>
  ),
}));

const mockProject = { metadata: { name: 'my-project' } } as ProjectKind;

const renderPage = ({
  workspace,
  projects = [mockProject],
  serverName = 'my-server',
}: {
  workspace?: string;
  projects?: ProjectKind[];
  serverName?: string;
} = {}) => {
  mockSearchParams = new URLSearchParams(workspace ? { workspace } : {});
  return render(
    <MemoryRouter initialEntries={[`${MCP_REGISTRY_BASENAME}/${serverName}`]}>
      <Routes>
        <Route
          path={`${MCP_REGISTRY_BASENAME}/:serverName`}
          element={
            <ProjectsContext.Provider
              value={{
                projects,
                modelServingProjects: projects,
                nonActiveProjects: [],
                preferredProject: projects[0] ?? null,
                updatePreferredProject: () => undefined,
                waitForProject: () => Promise.resolve(),
                loaded: true,
                loadError: undefined,
              }}
            >
              <MlflowMcpRegistryDetailPage />
            </ProjectsContext.Provider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};

describe('MlflowMcpRegistryDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedWrapperProps = undefined;
  });

  it('should redirect to the default project while preserving the requested server when no workspace is selected', () => {
    renderPage({ workspace: undefined, projects: [mockProject], serverName: 'my-server' });

    // A bookmarked/shared detail URL without a workspace param should still
    // land on the same server once a default project is picked, not bounce
    // back to the bare list.
    expect(mockNavigateEl).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `${MCP_REGISTRY_BASENAME}/my-server?workspace=my-project`,
        replace: true,
      }),
    );
    expect(screen.queryByTestId('lazy-wrapper')).not.toBeInTheDocument();
  });

  it('should URL-encode the server name when preserving it in the redirect', () => {
    renderPage({
      workspace: undefined,
      projects: [mockProject],
      serverName: encodeURIComponent('io.github.acme/widget-server'),
    });

    expect(mockNavigateEl).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `${MCP_REGISTRY_BASENAME}/io.github.acme%2Fwidget-server?workspace=my-project`,
        replace: true,
      }),
    );
  });

  it('should mount the wrapper with the correct basename when a workspace is selected', () => {
    renderPage({ workspace: 'my-project' });

    expect(screen.getByTestId('lazy-wrapper')).toBeInTheDocument();
    expect(mockNavigateEl).not.toHaveBeenCalled();
    expect(capturedWrapperProps?.basename).toBe(MCP_REGISTRY_BASENAME);
  });

  it('should mount the wrapper even with no projects (no redirect target available)', () => {
    renderPage({ workspace: undefined, projects: [] });

    expect(screen.getByTestId('lazy-wrapper')).toBeInTheDocument();
    expect(mockNavigateEl).not.toHaveBeenCalled();
  });

  it('should not render a breadcrumb before the remote reports any segments', () => {
    renderPage({ workspace: 'my-project' });

    expect(screen.getByTestId('breadcrumb-slot').textContent).toBe('');
  });

  it('should sync the host route and render the breadcrumb once the remote reports segments', () => {
    renderPage({ workspace: 'my-project' });

    act(() => {
      capturedWrapperProps?.onBreadcrumbChange([
        { label: 'My MCP Server', path: '/my-mcp-server' },
      ]);
    });

    expect(mockSyncHostRoute).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('mlflow-breadcrumb-active').textContent).toBe('My MCP Server');
  });

  it('should clear the breadcrumb again once the remote reports an empty segment list', () => {
    renderPage({ workspace: 'my-project' });

    act(() => {
      capturedWrapperProps?.onBreadcrumbChange([
        { label: 'My MCP Server', path: '/my-mcp-server' },
      ]);
    });
    expect(screen.getByTestId('mlflow-breadcrumb-active')).toBeInTheDocument();

    act(() => {
      capturedWrapperProps?.onBreadcrumbChange([]);
    });

    expect(screen.getByTestId('breadcrumb-slot').textContent).toBe('');
    expect(mockSyncHostRoute).toHaveBeenCalledTimes(2);
  });
});
