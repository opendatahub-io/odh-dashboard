import * as React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
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

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
}));

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectIconWithSize', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectIconWithSizeModule(),
);

jest.mock('@odh-dashboard/internal/types', () =>
  require('~/__tests__/unit/testUtils/mocks').mockIconSizeModule(),
);

jest.mock('../EvalHubProjectSelector', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectSelectorModule(),
);

const mockUseNamespaceSelector = jest.mocked(ModArchCore.useNamespaceSelector);
let location: ReturnType<typeof useLocation>;
let navigate: ReturnType<typeof useNavigate>;
const Observer: React.FC = () => {
  location = useLocation();
  navigate = useNavigate();
  return null;
};

const renderWithRouter = (path: string, getInvalidRedirectPath: (ns: string) => string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Observer />
      <Routes>
        <Route
          path="/"
          element={<EvalHubCoreLoader getInvalidRedirectPath={getInvalidRedirectPath} />}
        >
          <Route
            path=":namespace/*"
            element={<div data-testid="outlet-content">Outlet rendered</div>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

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

    it('should select the valid URL project instead of redirecting to the shared preference', () => {
      renderWithRouter('/project-b', mockGetRedirectPath);
      expect(location.pathname).toBe('/project-b');
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
      WorkingProjectStatusValue.Loading,
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

    it('should preserve the shared hook suffix and query behavior on masthead changes', async () => {
      const path = '/project-a/results/job-a?tab=runs#details';
      const view = renderWithRouter(path, mockGetRedirectPath);
      jest.mocked(useWorkingProject).mockReturnValue({
        ...jest.mocked(useWorkingProject)(),
        activeProject: { name: 'project-b' },
      });
      view.rerender(
        <MemoryRouter initialEntries={[path]}>
          <Observer />
          <Routes>
            <Route
              path="/"
              element={<EvalHubCoreLoader getInvalidRedirectPath={mockGetRedirectPath} />}
            >
              <Route path=":namespace/*" element={<div data-testid="outlet-content" />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => expect(location.pathname).toBe('/project-b/results/job-a'));
      expect(location.search).toBe('?tab=runs');
      expect(location.hash).toBe('#details');
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
