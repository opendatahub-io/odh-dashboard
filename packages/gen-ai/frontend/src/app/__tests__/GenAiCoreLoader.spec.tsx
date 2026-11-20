import * as React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import GenAiCoreLoader from '~/app/GenAiCoreLoader';

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/context/WorkingProjectContext', () => ({
  useWorkingProject: jest.fn(),
  WorkingProjectStatusValue: {
    Loading: 'loading',
    ProjectSourceError: 'project-source-error',
    NoProjectSelected: 'no-project-selected',
  },
  requiresWorkingProjectSelection: (status: string) =>
    ['loading', 'project-source-error', 'no-project-selected'].includes(status),
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  SupportedArea: { UNIFIED_PROJECT_SELECTOR: 'unified-project-selector' },
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: function ApplicationsPageMock({
    children,
    loaded,
  }: {
    children: React.ReactNode;
    loaded: boolean;
  }) {
    return (
      <div data-testid="applications-page" data-loaded={loaded}>
        {children}
      </div>
    );
  },
}));

let mockProviderMountId = 0;

jest.mock('~/app/context/GenAiContext', () => ({
  GenAiContextProvider: function GenAiContextProviderMock({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const { useState } = jest.requireActual<typeof React>('react');
    const [mountId] = useState(() => ++mockProviderMountId);
    return (
      <div data-testid="gen-ai-provider" data-mount-id={String(mountId)}>
        {children}
      </div>
    );
  },
}));

jest.mock('../GenAiCoreHeader', () => ({
  __esModule: true,
  default: function GenAiCoreHeaderMock() {
    return <div />;
  },
}));
jest.mock('../GenAiCoreNoProjects', () => ({
  __esModule: true,
  default: function GenAiCoreNoProjectsMock() {
    return <div>No projects</div>;
  },
}));

const mockUseNamespaceSelectorWithPersistence = jest.mocked(useNamespaceSelectorWithPersistence);
const mockUseWorkingProject = jest.mocked(useWorkingProject);
const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
type NamespaceSelectorReturn = ReturnType<typeof useNamespaceSelectorWithPersistence>;

const mockNamespaceSelectorReturn = (namespacesLoaded: boolean): NamespaceSelectorReturn => ({
  namespaces: [],
  namespacesLoaded,
  preferredNamespace: undefined,
  updatePreferredNamespace: jest.fn(),
  clearStoredNamespace: jest.fn(),
  namespacesLoadError: undefined,
  initializationError: undefined,
});

const namespaceSelectorReturn = (
  overrides: Partial<NamespaceSelectorReturn> = {},
): NamespaceSelectorReturn => ({
  ...mockNamespaceSelectorReturn(true),
  ...overrides,
});

const renderLoader = () =>
  render(
    <MemoryRouter initialEntries={['/assets']}>
      <Routes>
        <Route
          path="/assets"
          element={
            <GenAiCoreLoader
              allowNoProjects
              title="AI asset endpoints"
              getInvalidRedirectPath={(namespace) => `/assets/${namespace}`}
            />
          }
        >
          <Route index element={<div>AI Assets content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const renderProjectRedirectLoader = () =>
  render(
    <MemoryRouter initialEntries={['/playground']}>
      <Routes>
        <Route
          path="/playground"
          element={
            <GenAiCoreLoader
              title="Playground"
              getInvalidRedirectPath={(namespace) => `/playground/${namespace}`}
            />
          }
        />
        <Route path="*" element={<LocationCapture />} />
      </Routes>
    </MemoryRouter>,
  );

const LocationCapture: React.FC = () => {
  const location = useLocation();
  return (
    <div
      data-testid="location"
      data-pathname={location.pathname}
      data-search={location.search}
      data-hash={location.hash}
    />
  );
};

describe('GenAiCoreLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkingProject.mockReturnValue({
      status: 'provider-absent',
      projects: [],
      activeProject: null,
      selectProject: jest.fn(),
    });
    mockUseIsAreaAvailable.mockReturnValue({ status: false } as ReturnType<
      typeof useIsAreaAvailable
    >);
  });

  it('waits for namespaces to load before rendering no-project content', () => {
    mockUseNamespaceSelectorWithPersistence.mockReturnValue(mockNamespaceSelectorReturn(false));

    renderLoader();

    expect(screen.getByTestId('applications-page')).toHaveAttribute('data-loaded', 'false');
    expect(screen.queryByText('AI Assets content')).not.toBeInTheDocument();
  });

  it('renders project-independent AI Assets content after namespaces load with an empty list', () => {
    mockUseNamespaceSelectorWithPersistence.mockReturnValue(mockNamespaceSelectorReturn(true));

    renderLoader();

    expect(screen.getByText('AI Assets content')).toBeInTheDocument();
  });

  it('should prefer the active UPS project for a bare project route', () => {
    mockUseNamespaceSelectorWithPersistence.mockReturnValue(
      namespaceSelectorReturn({
        namespaces: [{ name: 'project-a' }, { name: 'project-b' }],
      }),
    );
    mockUseWorkingProject.mockReturnValue({
      status: 'listed',
      projects: [{ name: 'project-b' }],
      activeProject: { name: 'project-b' },
      selectProject: jest.fn(),
    });
    mockUseIsAreaAvailable.mockReturnValue({ status: true } as ReturnType<
      typeof useIsAreaAvailable
    >);

    renderProjectRedirectLoader();

    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-pathname',
      '/playground/project-b',
    );
  });

  it('should preserve the legacy first-namespace fallback when UPS is disabled', () => {
    mockUseNamespaceSelectorWithPersistence.mockReturnValue(
      namespaceSelectorReturn({
        namespaces: [
          { name: 'project-z', displayName: 'Alpha' },
          { name: 'project-a', displayName: 'Zulu' },
        ],
      }),
    );
    mockUseIsAreaAvailable.mockReturnValue({ status: false } as ReturnType<
      typeof useIsAreaAvailable
    >);
    mockUseWorkingProject.mockReturnValue({
      status: 'provider-absent',
      projects: [],
      activeProject: null,
      selectProject: jest.fn(),
    });

    renderProjectRedirectLoader();

    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-pathname',
      '/playground/project-z',
    );
  });

  it('should not redirect to the persisted project when UPS has no active project', () => {
    mockUseNamespaceSelectorWithPersistence.mockReturnValue({
      ...mockNamespaceSelectorReturn(true),
      namespaces: [{ name: 'project-a' }, { name: 'project-b' }],
      preferredNamespace: { name: 'project-a' },
    });
    mockUseWorkingProject.mockReturnValue({
      status: 'listed',
      projects: [{ name: 'project-a' }, { name: 'project-b' }],
      activeProject: null,
      selectProject: jest.fn(),
    });
    mockUseIsAreaAvailable.mockReturnValue({ status: true } as ReturnType<
      typeof useIsAreaAvailable
    >);

    renderProjectRedirectLoader();

    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it.each([
    {
      name: 'the project root route',
      initialEntry: '/playground/project-a',
      routePath: '/playground/:namespace',
      expectedPath: '/playground/project-b',
      getProjectPath: (projectName: string) => `/playground/${projectName}`,
    },
    {
      name: 'a nested asset route with query and hash',
      initialEntry: '/assets/project-a/agent-endpoints?filter=active#details',
      routePath: '/assets/:namespace/:tab',
      expectedPath: '/assets/project-b/agent-endpoints',
      expectedSearch: '?filter=active',
      expectedHash: '#details',
      getProjectPath: (projectName: string) => `/assets/${projectName}`,
    },
  ])(
    'should preserve the route when the active UPS project changes from $name',
    async ({
      initialEntry,
      routePath,
      expectedPath,
      expectedSearch = '',
      expectedHash = '',
      getProjectPath,
    }) => {
      mockUseNamespaceSelectorWithPersistence.mockReturnValue(
        namespaceSelectorReturn({
          namespaces: [{ name: 'project-a' }, { name: 'project-b' }],
          preferredNamespace: { name: 'project-a' },
        }),
      );
      let activeProject = { name: 'project-a' };
      mockUseWorkingProject.mockImplementation(() => ({
        status: 'listed',
        projects: [{ name: 'project-a' }, { name: 'project-b' }],
        activeProject,
        selectProject: jest.fn(),
      }));
      mockUseIsAreaAvailable.mockReturnValue({ status: true } as ReturnType<
        typeof useIsAreaAvailable
      >);

      const tree = () => (
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              path={routePath}
              element={
                <GenAiCoreLoader title="Playground" getInvalidRedirectPath={getProjectPath} />
              }
            >
              <Route index element={<LocationCapture />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
      const view = render(tree());

      expect(screen.getByTestId('location')).toHaveAttribute(
        'data-pathname',
        initialEntry.split('?')[0].split('#')[0],
      );

      activeProject = { name: 'project-b' };
      view.rerender(tree());

      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveAttribute('data-pathname', expectedPath);
      });
      expect(screen.getByTestId('location')).toHaveAttribute('data-search', expectedSearch);
      expect(screen.getByTestId('location')).toHaveAttribute('data-hash', expectedHash);
    },
  );

  describe('when the unified project selector is enabled', () => {
    const projectNamespaces = [{ name: 'project-a' }, { name: 'project-b' }];

    const projectRoute = (
      <Routes>
        <Route
          path="/playground/:namespace"
          element={
            <GenAiCoreLoader
              title="Playground"
              getInvalidRedirectPath={(projectName) => `/playground/${projectName}`}
            />
          }
        >
          <Route index element={<div>Playground content</div>} />
        </Route>
      </Routes>
    );

    beforeEach(() => {
      mockUseNamespaceSelectorWithPersistence.mockReturnValue(
        namespaceSelectorReturn({ namespaces: projectNamespaces }),
      );
      mockUseIsAreaAvailable.mockReturnValue({ status: true } as ReturnType<
        typeof useIsAreaAvailable
      >);
    });

    it.each([
      {
        name: 'when selection commits',
        commitSelection: true,
      },
      {
        name: 'when selection does not commit',
        commitSelection: false,
      },
    ])('should select the URL project $name without redirecting', ({ commitSelection }) => {
      let activeProject = { name: 'project-a' };
      const selectProject = jest.fn(({ name }: { name: string }) => {
        if (commitSelection) {
          activeProject = { name };
        }
      });
      mockUseWorkingProject.mockImplementation(() => ({
        status: 'listed',
        projects: projectNamespaces,
        activeProject,
        selectProject,
      }));

      const tree = () => (
        <Routes>
          <Route
            path="/playground/:namespace"
            element={
              <GenAiCoreLoader
                title="Playground"
                getInvalidRedirectPath={(projectName) => `/playground/${projectName}`}
              />
            }
          >
            <Route index element={<div>Playground content</div>} />
          </Route>
        </Routes>
      );

      const view = render(
        <MemoryRouter initialEntries={['/playground/project-b']}>{tree()}</MemoryRouter>,
      );

      if (commitSelection) {
        view.rerender(
          <MemoryRouter initialEntries={['/playground/project-b']}>{tree()}</MemoryRouter>,
        );
      }

      expect(selectProject).toHaveBeenCalledWith({ name: 'project-b' });
      expect(screen.getByText('Playground content')).toBeInTheDocument();
    });

    it('should not select an unknown URL project', () => {
      const selectProject = jest.fn();
      mockUseWorkingProject.mockReturnValue({
        status: 'listed',
        projects: projectNamespaces,
        activeProject: { name: 'project-a' },
        selectProject,
      });

      render(
        <MemoryRouter initialEntries={['/playground/unknown-project']}>
          {projectRoute}
        </MemoryRouter>,
      );

      expect(selectProject).not.toHaveBeenCalled();
    });

    it('should validate the route against UPS projects when UPS is enabled', () => {
      const selectProject = jest.fn();
      mockUseNamespaceSelectorWithPersistence.mockReturnValue(
        namespaceSelectorReturn({
          namespaces: [{ name: 'project-a' }, { name: 'project-b' }],
        }),
      );
      mockUseWorkingProject.mockReturnValue({
        status: 'listed',
        projects: [{ name: 'project-a' }],
        activeProject: { name: 'project-a' },
        selectProject,
      });

      render(
        <MemoryRouter initialEntries={['/playground/project-b']}>{projectRoute}</MemoryRouter>,
      );

      expect(screen.queryByText('Playground content')).not.toBeInTheDocument();
      expect(selectProject).not.toHaveBeenCalled();
    });
  });

  it('should remount the GenAI provider when the namespace changes with UPS disabled', () => {
    const namespaces = [{ name: 'project-a' }, { name: 'project-b' }];
    let navigate: ReturnType<typeof useNavigate>;
    const NavigationCapture = () => {
      navigate = useNavigate();
      return null;
    };
    mockUseNamespaceSelectorWithPersistence.mockReturnValue(
      namespaceSelectorReturn({ namespaces }),
    );
    mockUseIsAreaAvailable.mockReturnValue({ status: false } as ReturnType<
      typeof useIsAreaAvailable
    >);
    mockUseWorkingProject.mockReturnValue({
      status: 'provider-absent',
      projects: [],
      activeProject: null,
      selectProject: jest.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/playground/project-a']}>
        <NavigationCapture />
        <Routes>
          <Route
            path="/playground/:namespace"
            element={
              <GenAiCoreLoader
                title="Playground"
                getInvalidRedirectPath={(projectName) => `/playground/${projectName}`}
              />
            }
          >
            <Route index element={<div>Playground content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const firstMountId = screen.getByTestId('gen-ai-provider').getAttribute('data-mount-id');
    act(() => navigate('/playground/project-b'));

    return waitFor(() => {
      expect(screen.getByTestId('gen-ai-provider')).not.toHaveAttribute(
        'data-mount-id',
        firstMountId,
      );
    });
  });
});
