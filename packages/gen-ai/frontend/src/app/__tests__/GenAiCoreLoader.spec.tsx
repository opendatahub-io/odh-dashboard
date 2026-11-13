import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import GenAiCoreLoader from '~/app/GenAiCoreLoader';

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/context/WorkingProjectContext', () => ({
  useWorkingProject: jest.fn(),
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

jest.mock('~/app/context/GenAiContext', () => ({
  GenAiContextProvider: function GenAiContextProviderMock({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <>{children}</>;
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

const mockNamespaceSelectorReturn = (namespacesLoaded: boolean) =>
  ({
    namespaces: [],
    namespacesLoaded,
    preferredNamespace: undefined,
    updatePreferredNamespace: jest.fn(),
    clearStoredNamespace: jest.fn(),
    namespacesLoadError: undefined,
    initializationError: undefined,
  }) as ReturnType<typeof useNamespaceSelectorWithPersistence>;

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
  return <div data-testid="location" data-pathname={location.pathname} />;
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
    mockUseNamespaceSelectorWithPersistence.mockReturnValue({
      ...mockNamespaceSelectorReturn(true),
      namespaces: [{ name: 'project-a' }, { name: 'project-b' }],
      preferredNamespace: { name: 'project-a' },
    } as ReturnType<typeof useNamespaceSelectorWithPersistence>);
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

  it('should update the route when the active UPS project changes', async () => {
    mockUseNamespaceSelectorWithPersistence.mockReturnValue({
      ...mockNamespaceSelectorReturn(true),
      namespaces: [{ name: 'project-a' }, { name: 'project-b' }],
      preferredNamespace: { name: 'project-a' },
    } as ReturnType<typeof useNamespaceSelectorWithPersistence>);
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
      <MemoryRouter initialEntries={['/playground/project-a']}>
        <Routes>
          <Route
            path="/playground/:namespace"
            element={
              <GenAiCoreLoader
                title="Playground"
                getInvalidRedirectPath={(namespace) => `/playground/${namespace}`}
              />
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
      '/playground/project-a',
    );

    activeProject = { name: 'project-b' };
    view.rerender(tree());

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveAttribute(
        'data-pathname',
        '/playground/project-b',
      );
    });
  });

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
      mockUseNamespaceSelectorWithPersistence.mockReturnValue({
        ...mockNamespaceSelectorReturn(true),
        namespaces: projectNamespaces,
      } as ReturnType<typeof useNamespaceSelectorWithPersistence>);
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
  });
});
