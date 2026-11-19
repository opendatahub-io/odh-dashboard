import { renderHook } from '@testing-library/react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getProjectRouteWithSuffix,
  updateProjectQueryParam,
  useWorkingProjectRouteSync,
} from '../useWorkingProjectRouteSync';

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
}));

const mockUseLocation = jest.mocked(useLocation);
const mockUseNavigate = jest.mocked(useNavigate);

describe('getProjectRouteWithSuffix', () => {
  it('should preserve nested route suffixes', () => {
    expect(
      getProjectRouteWithSuffix(
        '/assets/project-a/models',
        'project-a',
        'project-b',
        (name: string) => `/assets/${name}`,
      ),
    ).toBe('/assets/project-b/models');
  });

  it('should discard an unknown suffix', () => {
    expect(
      getProjectRouteWithSuffix(
        '/other-route',
        'project-a',
        'project-b',
        (name: string) => `/assets/${name}`,
      ),
    ).toBe('/assets/project-b');
  });

  it('should not treat a shared path prefix as a project route', () => {
    expect(
      getProjectRouteWithSuffix(
        '/assets/project-audit',
        'project-a',
        'project-b',
        (name: string) => `/assets/${name}`,
      ),
    ).toBe('/assets/project-b');
  });

  it('should preserve nested route suffixes when the project path has a trailing slash', () => {
    expect(
      getProjectRouteWithSuffix(
        '/assets/project-a/models',
        'project-a',
        'project-b',
        (name: string) => `/assets/${name}/`,
      ),
    ).toBe('/assets/project-b/models');
  });

  it.each([
    {
      description: 'the namespace is empty',
      namespace: '',
      getProjectPath: (name: string) => (name ? `/assets/${name}` : ''),
    },
    {
      description: 'the current project path resolves empty',
      namespace: 'project-a',
      getProjectPath: (name: string) => (name === 'project-a' ? '' : `/assets/${name}`),
    },
  ])(
    'should return only the target project path when $description',
    ({ namespace, getProjectPath }) => {
      expect(
        getProjectRouteWithSuffix(
          '/assets/project-a/models',
          namespace,
          'project-b',
          getProjectPath,
        ),
      ).toBe('/assets/project-b');
    },
  );
});

describe('updateProjectQueryParam', () => {
  it('should update one project query parameter and preserve others', () => {
    expect(
      updateProjectQueryParam('?tab=connections&project=project-a', 'project', 'project-b'),
    ).toBe('?tab=connections&project=project-b');
  });

  it('should encode project names and replace duplicate project parameters', () => {
    expect(updateProjectQueryParam('?project=old&project=stale', 'project', 'team/a')).toBe(
      '?project=team%2Fa',
    );
  });
});

describe('useWorkingProjectRouteSync', () => {
  const navigate = jest.fn();
  const selectProject = jest.fn();
  const projects = [{ name: 'project-a' }, { name: 'project-b' }];
  type NoNavigationCase = {
    name: string;
    activeProjectName: string;
    routeProjectName: string;
    enabled: boolean;
    getProjectPath: ((projectName: string) => string) | null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(navigate);
    mockUseLocation.mockReturnValue({
      pathname: '/assets/project-a/models',
      search: '',
      hash: '',
    } as ReturnType<typeof useLocation>);
    selectProject.mockReset();
  });

  it('should replace the route when the active project differs', () => {
    const { rerender } = renderHook(
      ({ activeProjectName }: { activeProjectName: string }) =>
        useWorkingProjectRouteSync({
          activeProjectName,
          routeProjectName: 'project-a',
          projects,
          selectProject,
          enabled: true,
          getProjectPath: (name) => `/assets/${name}`,
        }),
      { initialProps: { activeProjectName: 'project-a' } },
    );

    rerender({ activeProjectName: 'project-b' });

    expect(navigate).toHaveBeenCalledWith(
      {
        pathname: '/assets/project-b/models',
        search: '',
        hash: '',
      },
      { replace: true },
    );
  });

  it('should not select or navigate for an invalid route project', () => {
    renderHook(() =>
      useWorkingProjectRouteSync({
        activeProjectName: 'project-a',
        routeProjectName: 'missing-project',
        projects,
        selectProject,
        enabled: true,
        getProjectPath: (name) => `/assets/${name}`,
      }),
    );

    expect(selectProject).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should navigate when the active project changes', () => {
    const { rerender } = renderHook(
      ({ activeProjectName }: { activeProjectName: string }) =>
        useWorkingProjectRouteSync({
          activeProjectName,
          routeProjectName: 'project-a',
          projects,
          selectProject,
          enabled: true,
          getProjectPath: (projectName) => `/assets/${projectName}`,
        }),
      { initialProps: { activeProjectName: 'project-a' } },
    );

    expect(navigate).not.toHaveBeenCalled();

    rerender({ activeProjectName: 'project-b' });

    expect(navigate).toHaveBeenCalledWith(
      { pathname: '/assets/project-b/models', search: '', hash: '' },
      { replace: true },
    );
  });

  it('should select a valid route project once on entry', () => {
    renderHook(() =>
      useWorkingProjectRouteSync({
        activeProjectName: 'project-a',
        routeProjectName: 'project-b',
        projects,
        selectProject,
        enabled: true,
        getProjectPath: (projectName) => `/assets/${projectName}`,
      }),
    );

    expect(selectProject).toHaveBeenCalledWith(projects[1]);
    expect(navigate).not.toHaveBeenCalled();
  });

  describe('route selection lifecycle', () => {
    it.each([
      {
        name: 'when the selection commits',
        activeProjectNameAfterSelection: 'project-b',
      },
      {
        name: 'when the selection does not commit',
        activeProjectNameAfterSelection: 'project-a',
      },
    ])('should not repeat selection or navigate $name', ({ activeProjectNameAfterSelection }) => {
      const { rerender } = renderHook(
        ({ activeProjectName }: { activeProjectName: string }) =>
          useWorkingProjectRouteSync({
            activeProjectName,
            routeProjectName: 'project-b',
            projects,
            selectProject,
            enabled: true,
            getProjectPath: (projectName) => `/assets/${projectName}`,
          }),
        { initialProps: { activeProjectName: 'project-a' } },
      );

      rerender({ activeProjectName: activeProjectNameAfterSelection });
      rerender({ activeProjectName: activeProjectNameAfterSelection });

      expect(selectProject).toHaveBeenCalledTimes(1);
      expect(selectProject).toHaveBeenCalledWith(projects[1]);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('should resume selection after an unresolved pending selection is left and re-entered', () => {
      const { rerender } = renderHook(
        ({
          activeProjectName,
          routeProjectName,
        }: {
          activeProjectName: string;
          routeProjectName?: string;
        }) =>
          useWorkingProjectRouteSync({
            activeProjectName,
            routeProjectName,
            projects,
            selectProject,
            enabled: true,
            getProjectPath: (projectName) => `/assets/${projectName}`,
          }),
        {
          initialProps: {
            activeProjectName: 'project-a',
            routeProjectName: 'project-b',
          },
        },
      );

      // The initial selection remains pending because the active project never changes.
      rerender({ activeProjectName: 'project-a', routeProjectName: 'project-b' });
      // Leave the project-scoped route, then re-enter it.
      rerender({ activeProjectName: 'project-a', routeProjectName: '' });
      rerender({ activeProjectName: 'project-a', routeProjectName: 'project-b' });

      expect(selectProject).toHaveBeenCalledTimes(2);
      expect(selectProject).toHaveBeenNthCalledWith(1, projects[1]);
      expect(selectProject).toHaveBeenNthCalledWith(2, projects[1]);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('route re-entry', () => {
    it.each([
      {
        name: 'a global route',
        intermediateRouteProjectName: '',
      },
      {
        name: 'an invalid route',
        intermediateRouteProjectName: 'unknown-project',
      },
    ])('should select the route project again after $name', ({ intermediateRouteProjectName }) => {
      const { rerender } = renderHook(
        ({
          activeProjectName,
          routeProjectName,
        }: {
          activeProjectName: string;
          routeProjectName?: string;
        }) =>
          useWorkingProjectRouteSync({
            activeProjectName,
            routeProjectName,
            projects,
            selectProject,
            enabled: true,
            getProjectPath: (projectName) => `/assets/${projectName}`,
          }),
        {
          initialProps: {
            activeProjectName: 'project-a',
            routeProjectName: 'project-b',
          },
        },
      );

      rerender({ activeProjectName: 'project-a', routeProjectName: intermediateRouteProjectName });
      rerender({ activeProjectName: 'project-a', routeProjectName: 'project-b' });

      expect(selectProject).toHaveBeenCalledTimes(2);
      expect(selectProject).toHaveBeenNthCalledWith(1, projects[1]);
      expect(selectProject).toHaveBeenNthCalledWith(2, projects[1]);
    });
  });

  it('should navigate to a newer user selection when the route selection does not commit', () => {
    const extendedProjects = [...projects, { name: 'project-c' }];
    let activeProjectName = 'project-a';
    const { rerender } = renderHook(
      ({ routeProjectName }: { routeProjectName: string }) =>
        useWorkingProjectRouteSync({
          activeProjectName,
          routeProjectName,
          projects: extendedProjects,
          selectProject,
          enabled: true,
          getProjectPath: (projectName) => `/assets/${projectName}`,
        }),
      { initialProps: { routeProjectName: 'project-b' } },
    );

    expect(selectProject).toHaveBeenCalledWith(extendedProjects[1]);
    expect(navigate).not.toHaveBeenCalled();

    activeProjectName = 'project-c';
    rerender({ routeProjectName: 'project-b' });

    expect(navigate).toHaveBeenCalledWith(
      { pathname: '/assets/project-c', search: '', hash: '' },
      { replace: true },
    );
  });

  const noNavigationCases: NoNavigationCase[] = [
    {
      name: 'UPS is disabled',
      activeProjectName: 'project-b',
      routeProjectName: 'project-a',
      enabled: false,
      getProjectPath: (name: string) => `/assets/${name}`,
    },
    {
      name: 'the consumer opts out for a global route',
      activeProjectName: 'project-b',
      routeProjectName: 'project-a',
      enabled: true,
      getProjectPath: null,
    },
    {
      name: 'the active project is unavailable',
      activeProjectName: '',
      routeProjectName: 'project-a',
      enabled: true,
      getProjectPath: (name: string) => `/assets/${name}`,
    },
    {
      name: 'the current project is unavailable',
      activeProjectName: 'project-b',
      routeProjectName: '',
      enabled: true,
      getProjectPath: (name: string) => `/assets/${name}`,
    },
    {
      name: 'the route already matches the active project',
      activeProjectName: 'project-a',
      routeProjectName: 'project-a',
      enabled: true,
      getProjectPath: (name: string) => `/assets/${name}`,
    },
    {
      name: 'the target location already matches the current location',
      activeProjectName: 'project-b',
      routeProjectName: 'project-a',
      enabled: true,
      getProjectPath: (name: string) => `/assets/${name}`,
    },
  ];

  it.each(noNavigationCases)(
    'should not navigate when $name',
    ({ activeProjectName, routeProjectName, enabled, getProjectPath }) => {
      renderHook(() =>
        useWorkingProjectRouteSync({
          activeProjectName,
          routeProjectName,
          projects,
          selectProject,
          enabled,
          getProjectPath,
        }),
      );

      expect(navigate).not.toHaveBeenCalled();
      if (getProjectPath === null) {
        expect(selectProject).not.toHaveBeenCalled();
      }
    },
  );

  it.each([
    {
      name: 'UPS disabled',
      enabled: false,
      getProjectPath: (projectName: string) => `/assets/${projectName}`,
    },
    { name: 'route path opt-out', enabled: true, getProjectPath: null },
  ])('should not register a route when $name', ({ enabled, getProjectPath }) => {
    const registerProjectRouteSync = jest.fn(() => jest.fn());

    renderHook(() =>
      useWorkingProjectRouteSync({
        activeProjectName: 'project-a',
        routeProjectName: 'project-b',
        projects,
        selectProject,
        enabled,
        getProjectPath,
        registerProjectRouteSync,
      }),
    );

    expect(registerProjectRouteSync).toHaveBeenCalledWith(undefined);
  });
});
