import * as React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useWorkingProjectRouteSync } from '@odh-dashboard/plugin-core/routing';
import { getStoredPreferredProject } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import {
  useWorkingProject,
  type WorkingProjectStatus,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import GlobalPipelineCoreLoader from '#~/pages/pipelines/global/GlobalPipelineCoreLoader';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  SupportedArea: { UNIFIED_PROJECT_SELECTOR: 'unified-project-selector' },
  useIsAreaAvailable: jest.fn(),
}));

/**
 * Routes run the real synchronization hook so project switching is exercised end to end; the spy
 * only records the options the loader hands over.
 */
jest.mock('@odh-dashboard/plugin-core/routing', () => {
  const actual = jest.requireActual('@odh-dashboard/plugin-core/routing');
  return {
    ...actual,
    useWorkingProjectRouteSync: jest.fn(actual.useWorkingProjectRouteSync),
  };
});

jest.mock('@odh-dashboard/ui-core/context/WorkingProjectContext', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core/context/WorkingProjectContext'),
  useWorkingProject: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/context/getStoredPreferredProject', () => ({
  getStoredPreferredProject: jest.fn(),
  PREFERRED_NAMESPACE_STORAGE_KEY: 'mod-arch.namespace.lastUsed',
}));

jest.mock('#~/pages/pipelines/global/PipelineCoreNoProjects', () => ({
  __esModule: true,
  default: function PipelineCoreNoProjectsMock() {
    return <div data-testid="pipeline-core-no-projects" />;
  },
}));

jest.mock('#~/concepts/pipelines/context', () => {
  const { useState } = jest.requireActual<typeof import('react')>('react');

  return {
    PipelineContextProvider: function PipelineContextProviderMock({
      namespace,
      children,
    }: {
      namespace: string;
      children: React.ReactNode;
    }) {
      // Counts real mounts so a project switch can be observed as unmount + mount.
      const [mountCount] = useState(() => {
        const counter = globalThis as typeof globalThis & { pipelineContextMounts?: number };
        counter.pipelineContextMounts = (counter.pipelineContextMounts ?? 0) + 1;
        return counter.pipelineContextMounts;
      });
      return (
        <div
          data-testid="pipeline-context"
          data-namespace={namespace}
          data-mount-count={mountCount}
        >
          {children}
        </div>
      );
    },
  };
});

jest.mock('../PipelineCoreProjectSelector', () => ({
  __esModule: true,
  default: function PipelineCoreProjectSelectorMock({
    getRedirectPath,
  }: {
    getRedirectPath: (namespace: string) => string;
  }) {
    return (
      <div data-testid="pipeline-project-selector" data-redirect-path={getRedirectPath('probe')} />
    );
  },
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
const mockUseWorkingProject = jest.mocked(useWorkingProject);
const mockUseWorkingProjectRouteSync = jest.mocked(useWorkingProjectRouteSync);
const mockGetStoredPreferredProject = jest.mocked(getStoredPreferredProject);

const getInvalidRedirectPath = (namespace: string) => `/pipelines/${namespace}`;

const buildProject = (name: string, displayName?: string): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Project',
  metadata: {
    name,
    annotations: displayName ? { 'openshift.io/display-name': displayName } : {},
  },
  status: { phase: 'Active' },
});

const buildProjects = (names: string[]): ProjectKind[] => names.map((name) => buildProject(name));

const resetMountCounters = () => {
  const counter = globalThis as typeof globalThis & {
    pipelineContextMounts?: number;
    routeElementMounts?: number;
  };
  counter.pipelineContextMounts = 0;
  counter.routeElementMounts = 0;
};

const readPipelineContextMounts = (): string | null =>
  screen.getByTestId('pipeline-context').getAttribute('data-mount-count');

const readRouteElementMounts = (): string | null =>
  screen.getByTestId('route-element-mounts').getAttribute('data-mount-count');

/**
 * Counts mounts of the route element itself, so a test can tell a provider remount
 * caused by its `key` apart from the route element being remounted by the router.
 */
const RouteElementMountProbe: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mountCount] = React.useState(() => {
    const counter = globalThis as typeof globalThis & { routeElementMounts?: number };
    counter.routeElementMounts = (counter.routeElementMounts ?? 0) + 1;
    return counter.routeElementMounts;
  });

  return (
    <>
      <div data-testid="route-element-mounts" data-mount-count={mountCount} />
      {children}
    </>
  );
};

const LocationProbe: React.FC = () => {
  const location = useLocation();
  // Back and Forward report POP; any push or replace reports PUSH or REPLACE, even when it
  // rewrites the location with an identical path, so this exposes navigations a location
  // assertion alone would hide.
  const navigationType = useNavigationType();
  return (
    <div
      data-testid="location"
      data-pathname={location.pathname}
      data-search={location.search}
      data-navigation-type={navigationType}
    />
  );
};

const NavigationControl: React.FC = () => {
  const navigate = useNavigate();
  return (
    <>
      <button
        type="button"
        data-testid="navigate-to-project-b"
        onClick={() => navigate('/pipelines/project-b')}
      />
      <button type="button" data-testid="navigate-back" onClick={() => navigate(-1)} />
      <button type="button" data-testid="navigate-forward" onClick={() => navigate(1)} />
    </>
  );
};

const expectPath = (pathname: string) =>
  expect(screen.getByTestId('location')).toHaveAttribute('data-pathname', pathname);

const getPageHeader = (): HTMLElement => {
  const header = screen
    .getByTestId('app-page-title')
    .closest('.odh-dashboard-applications-page-header');
  if (!header) {
    throw new Error('ApplicationsPage header was not rendered');
  }
  return header as HTMLElement;
};

type RenderLoaderOptions = {
  /** The single route entry the test starts on; use `history` for history navigation tests. */
  entry?: string;
  /** Multi-entry history, so Back and Forward can be exercised against real router state. */
  history?: { entries: string[]; initialIndex: number };
  projects?: ProjectKind[];
  preferredProject?: ProjectKind | null;
  storedProject?: ProjectKind;
  upsEnabled?: boolean;
  activeProject?: { name: string } | null;
  workingProjects?: { name: string }[];
  workingProjectStatus?: WorkingProjectStatus;
  strict?: boolean;
};

const defaultWorkingProjects = [{ name: 'project-a' }, { name: 'project-b' }];

const mockWorkingProject = ({
  activeProject,
  workingProjects,
  workingProjectStatus,
  selectProject,
  registerProjectRouteSync = jest.fn(),
}: {
  activeProject: { name: string } | null;
  workingProjects: { name: string }[];
  workingProjectStatus: WorkingProjectStatus;
  selectProject: jest.Mock;
  registerProjectRouteSync?: jest.Mock;
}) => {
  mockUseWorkingProject.mockReturnValue({
    status: workingProjectStatus,
    projects: workingProjects,
    activeProject,
    selectProject,
    registerProjectRouteSync,
  });
};

const buildTree = ({
  entry,
  history,
  projects = buildProjects(['project-a', 'project-b']),
  preferredProject = null,
  strict = false,
}: RenderLoaderOptions) => {
  const loaderElement = (
    <GlobalPipelineCoreLoader
      title="Pipelines"
      strict={strict}
      getInvalidRedirectPath={getInvalidRedirectPath}
    />
  );

  return (
    <MemoryRouter
      initialEntries={history?.entries ?? (entry ? [entry] : ['/pipelines'])}
      initialIndex={history?.initialIndex}
    >
      <LocationProbe />
      <NavigationControl />
      <ProjectsContext.Provider
        value={{
          projects,
          modelServingProjects: projects,
          nonActiveProjects: [],
          preferredProject,
          updatePreferredProject: jest.fn(),
          waitForProject: () => Promise.resolve(),
          loaded: true,
          loadError: undefined,
        }}
      >
        <Routes>
          <Route path="/pipelines" element={loaderElement} />
          <Route
            path="/pipelines/:namespace"
            element={<RouteElementMountProbe>{loaderElement}</RouteElementMountProbe>}
          >
            <Route index element={<div data-testid="pipelines-content" />} />
            <Route path="*" element={<div data-testid="pipelines-content" />} />
          </Route>
        </Routes>
      </ProjectsContext.Provider>
    </MemoryRouter>
  );
};

const renderLoader = (options: RenderLoaderOptions) => {
  const {
    projects = buildProjects(['project-a', 'project-b']),
    storedProject,
    upsEnabled = false,
    activeProject = { name: 'project-a' },
    workingProjects = defaultWorkingProjects,
    workingProjectStatus = 'listed',
  } = options;
  const selectProject = jest.fn();
  const registerProjectRouteSync = jest.fn();

  mockUseIsAreaAvailable.mockReturnValue({ status: upsEnabled } as ReturnType<
    typeof useIsAreaAvailable
  >);
  mockGetStoredPreferredProject.mockReturnValue(storedProject);
  mockWorkingProject({
    activeProject,
    workingProjects,
    workingProjectStatus,
    selectProject,
    registerProjectRouteSync,
  });

  return {
    ...render(buildTree({ ...options, projects })),
    selectProject,
    registerProjectRouteSync,
  };
};

describe('GlobalPipelineCoreLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMountCounters();
  });

  describe.each([
    { label: 'the unified project selector disabled', upsEnabled: false, selectorVisible: true },
    { label: 'the unified project selector enabled', upsEnabled: true, selectorVisible: false },
  ])('with $label', ({ upsEnabled, selectorVisible }) => {
    it('renders the no-projects page instead of the invalid project page when no project exists', async () => {
      renderLoader({
        entry: '/pipelines/project-a',
        upsEnabled,
        projects: [],
        workingProjects: [],
        activeProject: null,
        workingProjectStatus: 'empty-list',
      });

      expect(await screen.findByTestId('pipeline-core-no-projects')).toBeInTheDocument();
      expect(screen.queryByText('Project not found')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pipeline-context')).not.toBeInTheDocument();
    });

    it('renders the nested routes inside the pipeline context for a valid namespace', async () => {
      renderLoader({
        entry: '/pipelines/project-b',
        upsEnabled,
        activeProject: { name: 'project-b' },
      });

      expect(await screen.findByTestId('pipelines-content')).toBeInTheDocument();
      const pipelineContext = screen.getByTestId('pipeline-context');
      expect(pipelineContext).toHaveAttribute('data-namespace', 'project-b');
      expect(within(pipelineContext).getByTestId('pipelines-content')).toBeInTheDocument();
      expect(screen.queryByText('Project not found')).not.toBeInTheDocument();
      expectPath('/pipelines/project-b');
    });

    it('renders the invalid project page for an unknown namespace', async () => {
      const { selectProject } = renderLoader({
        entry: '/pipelines/unknown-project',
        upsEnabled,
      });

      expect(await screen.findByText('Project unknown-project was not found.')).toBeInTheDocument();
      expect(screen.queryByTestId('pipeline-context')).not.toBeInTheDocument();
      // The route names a project the loader cannot resolve, so it never adopts its namespace.
      expect(selectProject).not.toHaveBeenCalled();
      expectPath('/pipelines/unknown-project');
    });

    it('registers an invalid route with the host instead of guessing a recovery destination', async () => {
      const { registerProjectRouteSync } = renderLoader({
        entry: '/pipelines/unknown-project',
        upsEnabled,
      });

      await screen.findByText('Project unknown-project was not found.');

      if (upsEnabled) {
        // Recovery scans the host's real project list, so the hook only reports the invalid route.
        await waitFor(() =>
          expect(registerProjectRouteSync).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'invalid', recover: expect.any(Function) }),
          ),
        );
      } else {
        expect(registerProjectRouteSync).toHaveBeenCalledWith(undefined);
      }
    });

    it(`renders the project selector in the page header: ${selectorVisible}`, async () => {
      renderLoader({ entry: '/pipelines/unknown-project', upsEnabled });

      await screen.findByText('Project unknown-project was not found.');

      if (selectorVisible) {
        expect(
          within(getPageHeader()).getByTestId('pipeline-project-selector'),
        ).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId('pipeline-project-selector')).not.toBeInTheDocument();
      }
    });

    it(`renders the empty-state project selector: ${selectorVisible}`, async () => {
      renderLoader({ entry: '/pipelines/unknown-project', upsEnabled });

      await screen.findByText('Project unknown-project was not found.');

      if (selectorVisible) {
        // The old selector is the only way out of the empty state when the masthead has none.
        expect(screen.getByTestId('project-selector-toggle')).toBeInTheDocument();
      } else {
        // A second selector next to the masthead one duplicates the same control.
        expect(screen.queryByTestId('project-selector-toggle')).not.toBeInTheDocument();
      }
    });
  });

  describe('project resolution without a namespace and the unified project selector disabled', () => {
    it('redirects to the stored project ahead of the preferred project', async () => {
      renderLoader({
        entry: '/pipelines',
        storedProject: buildProject('project-b'),
        preferredProject: buildProject('project-a'),
        activeProject: { name: 'working-project' },
        workingProjects: [{ name: 'working-project' }],
      });

      await waitFor(() => expectPath('/pipelines/project-b'));
      expect(await screen.findByTestId('pipelines-content')).toBeInTheDocument();
      expect(screen.getByTestId('pipeline-context')).toHaveAttribute('data-namespace', 'project-b');
    });

    it('redirects to the preferred project when nothing is stored', async () => {
      renderLoader({
        entry: '/pipelines',
        preferredProject: buildProject('project-b'),
      });

      await waitFor(() => expectPath('/pipelines/project-b'));
    });

    it('redirects to the first project of the list it receives when nothing is stored or preferred', async () => {
      renderLoader({
        entry: '/pipelines',
        // ProjectsContextProvider hands the loader a display-name ordered list, so "Alpha
        // project" is first here even though its resource name sorts after "zeta".
        projects: [buildProject('zeta', 'Alpha project'), buildProject('alpha', 'Zeta project')],
      });

      await waitFor(() => expectPath('/pipelines/zeta'));
    });

    it('redirects to the first entry as given instead of re-sorting the list', async () => {
      renderLoader({
        entry: '/pipelines',
        // localeCompare (ProjectsContextProvider's ordering) puts "Project 10" before
        // "Project 2". Do not "fix" this fixture into numeric order: the point is that the
        // loader must keep the given order. Re-sorting with orderWorkingProjects
        // (Intl.Collator with numeric: true) would put "Project 2" first and land there.
        projects: [
          buildProject('project-10', 'Project 10'),
          buildProject('project-2', 'Project 2'),
        ],
      });

      await waitFor(() => expectPath('/pipelines/project-10'));
    });

    it('does not redirect in strict mode', async () => {
      renderLoader({
        entry: '/pipelines',
        // Pinned on purpose: this test is the AC-1 proof for the redirect condition, so it must
        // keep exercising the gate-off branch even if the helper default changes.
        upsEnabled: false,
        strict: true,
        storedProject: buildProject('project-b'),
      });

      expect(await screen.findByText('The project was not found.')).toBeInTheDocument();
      expect(screen.queryByTestId('pipeline-project-selector')).not.toBeInTheDocument();
      expectPath('/pipelines');
    });
  });

  describe('project resolution without a namespace and the unified project selector enabled', () => {
    it('redirects to the working project instead of the stored or preferred project', async () => {
      renderLoader({
        entry: '/pipelines',
        upsEnabled: true,
        projects: buildProjects(['project-a', 'project-b', 'project-c']),
        storedProject: buildProject('project-a'),
        preferredProject: buildProject('project-a'),
        activeProject: { name: 'project-c' },
        workingProjects: [{ name: 'project-a' }, { name: 'project-c' }],
      });

      await waitFor(() => expectPath('/pipelines/project-c'));
      expect(screen.getByTestId('pipeline-context')).toHaveAttribute('data-namespace', 'project-c');
    });

    it('redirects to the active project in strict mode instead of showing an unrecoverable page', async () => {
      renderLoader({
        entry: '/pipelines',
        upsEnabled: true,
        strict: true,
        // Stored and preferred name another project, so landing on project-b proves the redirect
        // comes from the active project rather than a fallback.
        storedProject: buildProject('project-a'),
        preferredProject: buildProject('project-a'),
        activeProject: { name: 'project-b' },
      });

      await waitFor(() => expectPath('/pipelines/project-b'));
      expect(screen.getByTestId('pipeline-context')).toHaveAttribute('data-namespace', 'project-b');
      // The invalid project page would be a dead end here: it hides the selector and the route
      // registers no recovery destination without a namespace.
      expect(screen.queryByText(/was not found/)).not.toBeInTheDocument();
    });

    it.each([
      { status: 'loading' as WorkingProjectStatus, projects: buildProjects(['project-a']) },
      { status: 'project-source-error' as WorkingProjectStatus, projects: [] },
      {
        status: 'no-project-selected' as WorkingProjectStatus,
        projects: buildProjects(['project-a']),
      },
    ])(
      'asks for a project selection instead of reporting no projects when the status is $status',
      async ({ status, projects }) => {
        renderLoader({
          entry: '/pipelines',
          upsEnabled: true,
          projects,
          storedProject: buildProject('project-b'),
          preferredProject: buildProject('project-a'),
          activeProject: null,
          workingProjects: projects.map(({ metadata }) => ({ name: metadata.name })),
          workingProjectStatus: status,
        });

        expect(await screen.findByText('Select a project to begin')).toBeInTheDocument();
        expect(
          screen.getByText('Choose a project from the project selector to continue.'),
        ).toBeInTheDocument();
        expect(screen.queryByTestId('pipeline-core-no-projects')).not.toBeInTheDocument();
        // Stored and preferred projects exist, so an unchanged path proves no fallback redirect.
        expectPath('/pipelines');
      },
    );

    it('reports no projects when the project list is genuinely empty', async () => {
      renderLoader({
        entry: '/pipelines',
        upsEnabled: true,
        projects: [],
        activeProject: null,
        workingProjects: [],
        workingProjectStatus: 'empty-list',
      });

      expect(await screen.findByTestId('pipeline-core-no-projects')).toBeInTheDocument();
      expect(screen.queryByText('Select a project to begin')).not.toBeInTheDocument();
    });
  });

  describe('working project route synchronization', () => {
    it('opts pipelines out of route-state preservation when the unified selector is enabled', async () => {
      const workingProjects = [{ name: 'project-a' }, { name: 'project-b' }];

      renderLoader({
        entry: '/pipelines/project-a',
        upsEnabled: true,
        activeProject: { name: 'project-a' },
        workingProjects,
      });

      await screen.findByTestId('pipelines-content');

      expect(mockUseWorkingProjectRouteSync).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          activeProjectName: 'project-a',
          routeProjectName: 'project-a',
          projects: workingProjects,
          getProjectPath: getInvalidRedirectPath,
          preserveRouteState: false,
        }),
      );
    });

    it('disables route synchronization when the unified selector is off', async () => {
      renderLoader({ entry: '/pipelines/project-a' });

      await screen.findByTestId('pipelines-content');

      expect(mockUseWorkingProjectRouteSync).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          routeProjectName: 'project-a',
          getProjectPath: getInvalidRedirectPath,
        }),
      );
    });

    it('selects the route project when the active project differs', async () => {
      const { selectProject } = renderLoader({
        entry: '/pipelines/project-b',
        upsEnabled: true,
        activeProject: { name: 'project-a' },
      });

      expect(await screen.findByTestId('pipelines-content')).toBeInTheDocument();
      await waitFor(() => expect(selectProject).toHaveBeenCalledWith({ name: 'project-b' }));
      // The route already names the project, so selection must not bounce the location.
      expectPath('/pipelines/project-b');
    });

    it('lands on the section base route when the project changes from the masthead', async () => {
      const options: RenderLoaderOptions = {
        entry: '/pipelines/project-a/runs/run-1?pipeline_version=3',
        upsEnabled: true,
        activeProject: { name: 'project-a' },
      };
      const { rerender, selectProject, registerProjectRouteSync } = renderLoader(options);

      expect(await screen.findByTestId('pipelines-content')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveAttribute('data-search', '?pipeline_version=3');

      // The masthead switches the active project while the route still names project-a's run.
      mockWorkingProject({
        activeProject: { name: 'project-b' },
        workingProjects: defaultWorkingProjects,
        workingProjectStatus: 'listed',
        selectProject,
        registerProjectRouteSync,
      });
      rerender(buildTree(options));

      await waitFor(() => expectPath('/pipelines/project-b'));
      expect(screen.getByTestId('location')).toHaveAttribute('data-search', '');
    });

    it('restores the route project when the browser goes back to a previous project route', async () => {
      const { selectProject } = renderLoader({
        history: {
          entries: ['/pipelines/project-a', '/pipelines/project-b'],
          initialIndex: 1,
        },
        upsEnabled: true,
        activeProject: { name: 'project-b' },
      });

      await waitFor(() =>
        expect(screen.getByTestId('pipeline-context')).toHaveAttribute(
          'data-namespace',
          'project-b',
        ),
      );
      // Entering project-b's route with project-b already active selects nothing.
      expect(selectProject).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('navigate-back'));

      // The hook adopts the previous route's project instead of bouncing the location forward.
      await waitFor(() => expect(selectProject).toHaveBeenCalledWith({ name: 'project-a' }));
      expect(screen.getByTestId('pipeline-context')).toHaveAttribute('data-namespace', 'project-a');
      expectPath('/pipelines/project-a');

      fireEvent.click(screen.getByTestId('navigate-forward'));

      await waitFor(() =>
        expect(screen.getByTestId('pipeline-context')).toHaveAttribute(
          'data-namespace',
          'project-b',
        ),
      );
      expectPath('/pipelines/project-b');
      // Forwards lands on the project the history already had selected, so no second selection.
      expect(selectProject).toHaveBeenCalledTimes(1);
    });

    it('keeps the query when the browser goes back to a history entry that has one', async () => {
      renderLoader({
        history: {
          entries: ['/pipelines/project-a/compare-runs?runs=a,b', '/pipelines/project-a/runs'],
          initialIndex: 1,
        },
        upsEnabled: true,
        activeProject: { name: 'project-a' },
      });

      expect(await screen.findByTestId('pipelines-content')).toBeInTheDocument();
      expectPath('/pipelines/project-a/runs');

      fireEvent.click(screen.getByTestId('navigate-back'));

      await waitFor(() => expectPath('/pipelines/project-a/compare-runs'));
      // Discarding the route suffix and query belongs to project switches only; a history entry
      // must come back exactly as it was recorded.
      expect(screen.getByTestId('location')).toHaveAttribute('data-search', '?runs=a,b');
      // Back is the only navigation. Any follow-up push or replace, even one rewriting the same
      // search, flips this to PUSH or REPLACE and exposes the regression a location check hides.
      expect(screen.getByTestId('location')).toHaveAttribute('data-navigation-type', 'POP');
    });

    it('does not render another project data for an unavailable namespace', async () => {
      renderLoader({
        entry: '/pipelines/unknown-project',
        upsEnabled: true,
        activeProject: { name: 'project-a' },
      });

      expect(await screen.findByText('Project unknown-project was not found.')).toBeInTheDocument();
      expect(screen.queryByTestId('pipeline-context')).not.toBeInTheDocument();
      // The active project must not leak its content into a route for a different namespace.
      expect(screen.queryByTestId('pipelines-content')).not.toBeInTheDocument();
    });
  });

  it('remounts the pipeline context when the route project changes', async () => {
    renderLoader({ entry: '/pipelines/project-a', upsEnabled: true });

    expect(await screen.findByTestId('pipelines-content')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-context')).toHaveAttribute('data-namespace', 'project-a');
    expect(readPipelineContextMounts()).toBe('1');
    expect(readRouteElementMounts()).toBe('1');

    fireEvent.click(screen.getByTestId('navigate-to-project-b'));

    await waitFor(() =>
      expect(screen.getByTestId('pipeline-context')).toHaveAttribute('data-namespace', 'project-b'),
    );
    // The route element survives the switch, so the new provider instance is the remount under test.
    expect(readRouteElementMounts()).toBe('1');
    expect(readPipelineContextMounts()).toBe('2');
  });

  it('reuses the pipeline context across a route project change when the unified selector is off', async () => {
    renderLoader({ entry: '/pipelines/project-a', upsEnabled: false });

    expect(await screen.findByTestId('pipelines-content')).toBeInTheDocument();
    expect(readPipelineContextMounts()).toBe('1');

    fireEvent.click(screen.getByTestId('navigate-to-project-b'));

    await waitFor(() =>
      expect(screen.getByTestId('pipeline-context')).toHaveAttribute('data-namespace', 'project-b'),
    );
    // Gate off keeps the existing behavior: the provider re-renders with the new namespace only.
    expect(readRouteElementMounts()).toBe('1');
    expect(readPipelineContextMounts()).toBe('1');
  });
});
