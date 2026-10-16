import * as React from 'react';
import { act } from 'react';
import { render, screen } from '@testing-library/react';
// MlflowBreadcrumbs renders react-router-dom's <Link>, which needs a Router
// context -- this import resolves through the mock below, which spreads the
// real module, so MemoryRouter/Routes/Route here are the genuine implementation.
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import MlflowSkillRegistryDetailPage from '../MlflowSkillRegistryDetailPage';
import { SKILL_REGISTRY_BASENAME } from '../const';

const mockSyncHostRoute = jest.fn();
jest.mock('../../shared/useHostRouteSync', () => ({
  __esModule: true,
  default: () => mockSyncHostRoute,
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
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({
    breadcrumb,
    children,
    loaded,
    empty,
    emptyStatePage,
  }: {
    breadcrumb?: React.ReactNode;
    children?: React.ReactNode;
    loaded: boolean;
    empty: boolean;
    emptyStatePage?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="breadcrumb-slot">{breadcrumb}</div>
      {!loaded ? <div data-testid="loading" /> : empty ? emptyStatePage : children}
    </div>
  ),
}));

let capturedInvalidProjectProps:
  | { namespace?: string; getRedirectPath: (namespace: string) => string }
  | undefined;
jest.mock('@odh-dashboard/ui-core/components/InvalidProject', () => ({
  __esModule: true,
  default: (p: { namespace?: string; getRedirectPath: (namespace: string) => string }) => {
    capturedInvalidProjectProps = p;
    return <div data-testid="invalid-project" />;
  },
}));

jest.mock('../../shared/NoProjectsEmptyState', () => ({
  __esModule: true,
  default: ({ testId }: { testId: string }) => <div data-testid={testId} />,
}));

const mockProject = { metadata: { name: 'my-project' } } as ProjectKind;

const renderPage = ({
  workspace,
  projects = [mockProject],
  skillPath = '/code-review',
  search = '',
  loaded = true,
}: {
  workspace?: string;
  projects?: ProjectKind[];
  skillPath?: string;
  search?: string;
  loaded?: boolean;
} = {}) => {
  const searchParams = new URLSearchParams(search);
  if (workspace) {
    searchParams.set('workspace', workspace);
  }
  mockSearchParams = searchParams;
  const query = searchParams.toString();
  return render(
    <MemoryRouter
      initialEntries={[`${SKILL_REGISTRY_BASENAME}${skillPath}${query ? `?${query}` : ''}`]}
    >
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
        <Routes>
          {[
            `${SKILL_REGISTRY_BASENAME}/:skillKey`,
            `${SKILL_REGISTRY_BASENAME}/:organization/:skillName`,
          ].map((path) => (
            <Route key={path} path={path} element={<MlflowSkillRegistryDetailPage />} />
          ))}
        </Routes>
      </ProjectsContext.Provider>
    </MemoryRouter>,
  );
};

describe('MlflowSkillRegistryDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedWrapperProps = undefined;
    capturedInvalidProjectProps = undefined;
  });

  it('should redirect to the default project while preserving the requested skill when no workspace is selected', () => {
    renderPage({ workspace: undefined, skillPath: '/code-review' });

    expect(mockNavigateEl).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `${SKILL_REGISTRY_BASENAME}/code-review?workspace=my-project`,
        replace: true,
      }),
    );
    expect(screen.queryByTestId('lazy-wrapper')).not.toBeInTheDocument();
  });

  it('should keep an encoded organization identity as one segment in the redirect', () => {
    renderPage({ workspace: undefined, skillPath: '/%40acme%2Fpdf-extract' });

    expect(mockNavigateEl).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `${SKILL_REGISTRY_BASENAME}/%40acme%2Fpdf-extract?workspace=my-project`,
        replace: true,
      }),
    );
  });

  it('should keep a two-segment organization path and the requested version in the redirect', () => {
    renderPage({ workspace: undefined, skillPath: '/@acme/pdf-extract', search: '?version=2' });

    expect(mockNavigateEl).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `${SKILL_REGISTRY_BASENAME}/@acme/pdf-extract?version=2&workspace=my-project`,
        replace: true,
      }),
    );
  });

  it('should mount the wrapper with the correct basename when a workspace is selected', () => {
    renderPage({ workspace: 'my-project' });

    expect(screen.getByTestId('lazy-wrapper')).toBeInTheDocument();
    expect(mockNavigateEl).not.toHaveBeenCalled();
    expect(capturedWrapperProps?.basename).toBe(SKILL_REGISTRY_BASENAME);
  });

  it('should show a loading state without redirecting while projects are loading', () => {
    renderPage({ workspace: undefined, projects: [], loaded: false });

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('lazy-wrapper')).not.toBeInTheDocument();
    expect(mockNavigateEl).not.toHaveBeenCalled();
  });

  it('should show the no-projects empty state instead of the wrapper when there are no projects', () => {
    renderPage({ workspace: undefined, projects: [] });

    expect(screen.getByTestId('skill-registry-no-projects-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('lazy-wrapper')).not.toBeInTheDocument();
    expect(mockNavigateEl).not.toHaveBeenCalled();
  });

  it('should show the invalid project state when the workspace does not match a project', () => {
    renderPage({
      workspace: 'missing-project',
      skillPath: '/@acme/pdf-extract',
      search: '?version=2',
    });

    expect(screen.getByTestId('invalid-project')).toBeInTheDocument();
    expect(screen.queryByTestId('lazy-wrapper')).not.toBeInTheDocument();
    expect(capturedInvalidProjectProps?.namespace).toBe('missing-project');
    expect(capturedInvalidProjectProps?.getRedirectPath('my-project')).toBe(
      `${SKILL_REGISTRY_BASENAME}/@acme/pdf-extract?version=2&workspace=my-project`,
    );
  });

  it('should not render a breadcrumb before the remote reports any segments', () => {
    renderPage({ workspace: 'my-project' });

    expect(screen.getByTestId('breadcrumb-slot').textContent).toBe('');
  });

  it('should sync the host route and render the breadcrumb once the remote reports segments', () => {
    renderPage({ workspace: 'my-project' });

    act(() => {
      capturedWrapperProps?.onBreadcrumbChange([
        { label: 'Skills', path: '/' },
        { label: '@acme/pdf-extract', path: '/%40acme%2Fpdf-extract' },
      ]);
    });

    expect(mockSyncHostRoute).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('mlflow-breadcrumb-active').textContent).toBe('@acme/pdf-extract');
    expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute(
      'href',
      `${SKILL_REGISTRY_BASENAME}/?workspace=my-project`,
    );
  });

  it('should clear the breadcrumb again once the remote reports an empty segment list', () => {
    renderPage({ workspace: 'my-project' });

    act(() => {
      capturedWrapperProps?.onBreadcrumbChange([
        { label: 'Skills', path: '/' },
        { label: 'code-review', path: '/code-review' },
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
