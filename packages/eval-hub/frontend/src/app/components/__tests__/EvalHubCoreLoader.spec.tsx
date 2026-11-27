import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import {
  useWorkingProject,
  WorkingProjectStatusValue,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import * as ModArchCore from 'mod-arch-core';
import EvalHubCoreLoader from '~/app/components/EvalHubCoreLoader';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core/context/WorkingProjectContext', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core/context/WorkingProjectContext'),
  useWorkingProject: jest.fn(),
}));

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn(),
}));

jest.mock('~/app/context/CollectionsContext', () => ({
  CollectionsContextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectIconWithSize', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectIconWithSizeModule(),
);

jest.mock('@odh-dashboard/internal/types', () =>
  require('~/__tests__/unit/testUtils/mocks').mockIconSizeModule(),
);

const mockUseNamespaceSelector = jest.mocked(ModArchCore.useNamespaceSelector);
let location: ReturnType<typeof useLocation>;
let navigate: ReturnType<typeof useNavigate>;
const Observer: React.FC = () => {
  location = useLocation();
  navigate = useNavigate();
  return null;
};

const StatefulOutlet: React.FC = () => {
  const [selection, setSelection] = React.useState('');
  return (
    <input
      data-testid="project-selection"
      aria-label="Project selection"
      value={selection}
      onChange={(event) => setSelection(event.target.value)}
    />
  );
};

const getRouterTree = (
  path: string | Partial<ReturnType<typeof useLocation>>,
  getInvalidRedirectPath: (ns: string) => string,
  outlet: React.ReactNode = <div data-testid="outlet-content">Outlet rendered</div>,
) => (
  <MemoryRouter initialEntries={[path]}>
    <Observer />
    <Routes>
      <Route
        path="/"
        element={<EvalHubCoreLoader getInvalidRedirectPath={getInvalidRedirectPath} />}
      >
        <Route path=":namespace/*" element={outlet} />
      </Route>
    </Routes>
  </MemoryRouter>
);

const renderWithRouter = (path: string, getInvalidRedirectPath: (ns: string) => string) =>
  render(getRouterTree(path, getInvalidRedirectPath));

describe('EvalHubCoreLoader', () => {
  const mockGetRedirectPath = (ns: string) => `/${ns}`;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: false } as ReturnType<typeof useIsAreaAvailable>);
    jest.mocked(useWorkingProject).mockReturnValue({
      status: WorkingProjectStatusValue.ProviderAbsent,
      projects: [],
      activeProject: null,
      selectProject: jest.fn(),
    });
  });

  it('should show no projects state when namespaces array is empty', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [],
      namespacesLoaded: true,
      preferredNamespace: undefined,
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);

    renderWithRouter('/', mockGetRedirectPath);

    expect(screen.getByTestId('eval-hub-no-projects')).toBeInTheDocument();
  });

  it('should redirect to preferred namespace when no namespace param is set', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'project-a' }, { name: 'project-b' }],
      namespacesLoaded: true,
      preferredNamespace: { name: 'project-b' },
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);

    renderWithRouter('/', mockGetRedirectPath);

    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
  });

  it('should redirect to first namespace when no preferred namespace exists', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'project-a' }],
      namespacesLoaded: true,
      preferredNamespace: undefined,
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);

    renderWithRouter('/', mockGetRedirectPath);

    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
  });

  it('should render Outlet when a valid namespace is selected', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'my-project' }],
      namespacesLoaded: true,
      preferredNamespace: undefined,
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);

    renderWithRouter('/my-project', mockGetRedirectPath);

    expect(screen.getByTestId('outlet-content')).toHaveTextContent('Outlet rendered');
  });

  it('should show invalid project state for an unrecognized namespace', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'real-project' }],
      namespacesLoaded: true,
      preferredNamespace: undefined,
    } as unknown as ReturnType<typeof ModArchCore.useNamespaceSelector>);

    renderWithRouter('/bad-project', mockGetRedirectPath);

    expect(screen.getByTestId('eval-hub-invalid-project')).toBeInTheDocument();
  });

  describe('UPS using the Gen AI routing pattern', () => {
    const selectProject = jest.fn();
    const registerProjectRouteSync = jest.fn(() => jest.fn());

    beforeEach(() => {
      jest
        .mocked(useIsAreaAvailable)
        .mockReturnValue({ status: true } as ReturnType<typeof useIsAreaAvailable>);
      jest.mocked(useWorkingProject).mockReturnValue({
        status: WorkingProjectStatusValue.Listed,
        projects: [{ name: 'project-a' }, { name: 'project-b' }],
        activeProject: { name: 'project-a' },
        selectProject,
        registerProjectRouteSync,
      });
      mockUseNamespaceSelector.mockReturnValue({
        namespaces: [{ name: 'project-a' }, { name: 'project-b' }],
        namespacesLoaded: true,
        preferredNamespace: { name: 'project-a' },
        updatePreferredNamespace: jest.fn(),
        clearStoredNamespace: jest.fn(),
        namespacesLoadError: undefined,
        initializationError: undefined,
      });
    });

    it.each(['/', '/project-a'])(
      'should show no projects with UPS and an empty namespace list at %s',
      (path) => {
        mockUseNamespaceSelector.mockReturnValue({
          ...mockUseNamespaceSelector(),
          namespaces: [],
          preferredNamespace: undefined,
        });
        jest.mocked(useWorkingProject).mockReturnValue({
          ...jest.mocked(useWorkingProject)(),
          status: WorkingProjectStatusValue.EmptyList,
          projects: [],
          activeProject: null,
        });

        renderWithRouter(path, mockGetRedirectPath);

        expect(screen.getByTestId('eval-hub-no-projects')).toBeInTheDocument();
        expect(screen.queryByTestId('header-content')).not.toBeInTheDocument();
        expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument();
        expect(location.pathname).toBe(path);
        expect(selectProject).not.toHaveBeenCalled();
      },
    );

    it.each(['/', '/project-b/results/job-b?tab=runs#details'])(
      'should show the standard loading state while UPS loads at %s',
      (path) => {
        jest.mocked(useWorkingProject).mockReturnValue({
          ...jest.mocked(useWorkingProject)(),
          status: WorkingProjectStatusValue.Loading,
          projects: [],
          activeProject: null,
        });
        const view = renderWithRouter(path, mockGetRedirectPath);

        expect(screen.getByRole('heading', { name: 'Loading' })).toBeInTheDocument();
        expect(screen.queryByTestId('eval-hub-invalid-project')).not.toBeInTheDocument();
        expect(screen.queryByTestId('eval-hub-no-projects')).not.toBeInTheDocument();
        expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument();
        expect(selectProject).not.toHaveBeenCalled();
        expect(location.pathname).toBe(new URL(path, 'http://localhost').pathname);

        jest.mocked(useWorkingProject).mockReturnValue({
          ...jest.mocked(useWorkingProject)(),
          status: WorkingProjectStatusValue.Listed,
          projects: [{ name: 'project-a' }, { name: 'project-b' }],
          activeProject: { name: 'project-a' },
        });
        view.rerender(getRouterTree(path, mockGetRedirectPath));

        expect(screen.queryByTestId('eval-hub-invalid-project')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Loading' })).not.toBeInTheDocument();
        expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
        if (path !== '/') {
          expect(selectProject).toHaveBeenCalledWith({ name: 'project-b' });
          expect(location.search).toBe('?tab=runs');
          expect(location.hash).toBe('#details');
        } else {
          expect(location.pathname).toBe('/project-a');
        }
      },
    );

    it('should use the same loading state with UPS disabled while namespaces load', () => {
      jest
        .mocked(useIsAreaAvailable)
        .mockReturnValue({ status: false } as ReturnType<typeof useIsAreaAvailable>);
      mockUseNamespaceSelector.mockReturnValue({
        ...mockUseNamespaceSelector(),
        namespaces: [],
        namespacesLoaded: false,
      });

      renderWithRouter('/project-a', mockGetRedirectPath);

      expect(screen.getByRole('heading', { name: 'Loading' })).toBeInTheDocument();
      expect(screen.queryByTestId('eval-hub-no-projects')).not.toBeInTheDocument();
    });

    it('should recover from an invalid project using the page selector with UPS enabled', async () => {
      const user = userEvent.setup();
      renderWithRouter('/bad-project', mockGetRedirectPath);

      expect(screen.getByTestId('eval-hub-invalid-project')).toBeInTheDocument();
      expect(screen.queryByTestId('header-content')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Select project/ }));
      await user.click(screen.getByRole('menuitem', { name: 'project-b' }));

      await waitFor(() => expect(location.pathname).toBe('/project-b'));
      expect(screen.queryByTestId('eval-hub-invalid-project')).not.toBeInTheDocument();
      expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
      expect(selectProject).toHaveBeenCalledWith({ name: 'project-b' });
    });

    it('should preserve child state within a project and reset it when switching projects', async () => {
      const path = '/project-a';
      const view = render(getRouterTree(path, mockGetRedirectPath, <StatefulOutlet />));
      fireEvent.change(screen.getByTestId('project-selection'), { target: { value: 'run-a' } });
      view.rerender(getRouterTree(path, mockGetRedirectPath, <StatefulOutlet />));
      expect(screen.getByTestId('project-selection')).toHaveValue('run-a');

      jest.mocked(useWorkingProject).mockReturnValue({
        ...jest.mocked(useWorkingProject)(),
        activeProject: { name: 'project-b' },
      });
      view.rerender(getRouterTree(path, mockGetRedirectPath, <StatefulOutlet />));

      await waitFor(() => expect(location.pathname).toBe('/project-b'));
      expect(screen.getByTestId('project-selection')).toHaveValue('');
    });

    it('should select the valid URL project instead of redirecting to the shared preference', () => {
      renderWithRouter('/project-b/results/job-b?tab=runs#details', mockGetRedirectPath);
      expect(location.pathname).toBe('/project-b/results/job-b');
      expect(location.search).toBe('?tab=runs');
      expect(location.hash).toBe('#details');
      expect(selectProject).toHaveBeenCalledWith({ name: 'project-b' });
      expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
    });

    it('should restore the shared active project for a bare route', () => {
      jest.mocked(useWorkingProject).mockReturnValue({
        ...jest.mocked(useWorkingProject)(),
        activeProject: { name: 'project-b' },
      });
      renderWithRouter('/', mockGetRedirectPath);
      expect(location.pathname).toBe('/project-b');
    });

    it('should validate against shared projects rather than the module namespace list', () => {
      jest.mocked(useWorkingProject).mockReturnValue({
        ...jest.mocked(useWorkingProject)(),
        projects: [{ name: 'project-a' }],
      });
      renderWithRouter('/project-b', mockGetRedirectPath);
      expect(location.pathname).toBe('/project-b');
      expect(screen.getByTestId('eval-hub-invalid-project')).toBeInTheDocument();
      expect(selectProject).not.toHaveBeenCalled();
    });

    it.each([
      WorkingProjectStatusValue.ProjectSourceError,
      WorkingProjectStatusValue.NoProjectSelected,
    ])('should prompt for selection on a bare route when shared status is %s', (status) => {
      jest.mocked(useWorkingProject).mockReturnValue({
        ...jest.mocked(useWorkingProject)(),
        status,
        activeProject: null,
      });
      renderWithRouter('/', mockGetRedirectPath);
      expect(location.pathname).toBe('/');
      expect(
        screen.getByRole('heading', { name: 'Select a project to begin' }),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('header-content')).not.toBeInTheDocument();
    });

    it.each([
      '/project-a?tab=runs',
      '/project-a/results/job-a?tab=runs#details',
      '/project-a/reconfigure/job-a',
      '/project-a/create/start?type=benchmark',
      '/project-a/create/start?type=collection',
      '/project-a/create/collections/collection-a/edit',
      '/project-a/create/collections/collection-a/copy',
      '/project-a/compare?runs=run-a,run-b&experiments=experiment-a,experiment-b',
    ])('should return to the new project landing page when switching from %s', async (path) => {
      const { pathname, search, hash } = new URL(path, 'http://localhost');
      const entry = {
        pathname,
        search,
        hash,
        state: {
          benchmark: { id: 'benchmark-a' },
          collection: { resource: { id: 'collection-a' } },
        },
      };
      const view = render(getRouterTree(entry, mockGetRedirectPath));
      expect(location.pathname).toBe(entry.pathname);
      expect(location.state).toEqual(entry.state);
      expect(selectProject).not.toHaveBeenCalled();
      jest.mocked(useWorkingProject).mockReturnValue({
        ...jest.mocked(useWorkingProject)(),
        activeProject: { name: 'project-b' },
      });
      view.rerender(getRouterTree(entry, mockGetRedirectPath));

      await waitFor(() => expect(location.pathname).toBe('/project-b'));
      expect(location.search).toBe('');
      expect(location.hash).toBe('');
      expect(location.state).toBeNull();
      expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
    });

    it('should leave the current route unchanged when UPS is disabled', () => {
      jest
        .mocked(useIsAreaAvailable)
        .mockReturnValue({ status: false } as ReturnType<typeof useIsAreaAvailable>);
      const path = '/project-a/results/job-a?tab=runs#details';
      const view = renderWithRouter(path, mockGetRedirectPath);
      jest.mocked(useWorkingProject).mockReturnValue({
        ...jest.mocked(useWorkingProject)(),
        activeProject: { name: 'project-b' },
      });
      view.rerender(getRouterTree(path, mockGetRedirectPath));

      expect(location.pathname).toBe('/project-a/results/job-a');
      expect(location.search).toBe('?tab=runs');
      expect(location.hash).toBe('#details');
      expect(selectProject).not.toHaveBeenCalled();
    });

    it('should reconcile a project URL reached through browser navigation', async () => {
      renderWithRouter('/project-a', mockGetRedirectPath);
      await act(async () => navigate('/project-b'));
      expect(selectProject).toHaveBeenLastCalledWith({ name: 'project-b' });
      await act(async () => navigate(-1));
      expect(location.pathname).toBe('/project-a');
    });
  });
});
