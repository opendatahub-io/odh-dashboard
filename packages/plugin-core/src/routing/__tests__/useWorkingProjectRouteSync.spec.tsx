import { renderHook } from '@testing-library/react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getProjectRouteWithSuffix,
  type ProjectRouteLocation,
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
  type NoNavigationCase = {
    name: string;
    activeProjectName: string;
    routeProjectName: string;
    enabled: boolean;
    getProjectLocation: (projectName: string) => ProjectRouteLocation | null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(navigate);
    mockUseLocation.mockReturnValue({
      pathname: '/assets/project-a/models',
      search: '',
      hash: '',
    } as ReturnType<typeof useLocation>);
  });

  it('should replace the route when the active project differs', () => {
    renderHook(() =>
      useWorkingProjectRouteSync({
        activeProjectName: 'project-b',
        routeProjectName: 'project-a',
        enabled: true,
        getProjectLocation: (name) => ({
          pathname: `/assets/${name}/models`,
          search: '?tab=models',
          hash: '#details',
        }),
      }),
    );

    expect(navigate).toHaveBeenCalledWith(
      {
        pathname: '/assets/project-b/models',
        search: '?tab=models',
        hash: '#details',
      },
      { replace: true },
    );
  });

  it('should navigate when the active project changes', () => {
    const { rerender } = renderHook(
      ({ activeProjectName }: { activeProjectName: string }) =>
        useWorkingProjectRouteSync({
          activeProjectName,
          routeProjectName: 'project-a',
          enabled: true,
          getProjectLocation: (projectName) => ({
            pathname: `/assets/${projectName}/models`,
          }),
        }),
      { initialProps: { activeProjectName: 'project-a' } },
    );

    expect(navigate).not.toHaveBeenCalled();

    rerender({ activeProjectName: 'project-b' });

    expect(navigate).toHaveBeenCalledWith(
      { pathname: '/assets/project-b/models' },
      { replace: true },
    );
  });

  const noNavigationCases: NoNavigationCase[] = [
    {
      name: 'UPS is disabled',
      activeProjectName: 'project-b',
      routeProjectName: 'project-a',
      enabled: false,
      getProjectLocation: (name: string) => ({ pathname: `/assets/${name}` }),
    },
    {
      name: 'the consumer opts out for a global route',
      activeProjectName: 'project-b',
      routeProjectName: 'project-a',
      enabled: true,
      getProjectLocation: () => null,
    },
    {
      name: 'the active project is unavailable',
      activeProjectName: '',
      routeProjectName: 'project-a',
      enabled: true,
      getProjectLocation: (name: string) => ({ pathname: `/assets/${name}` }),
    },
    {
      name: 'the current project is unavailable',
      activeProjectName: 'project-b',
      routeProjectName: '',
      enabled: true,
      getProjectLocation: (name: string) => ({ pathname: `/assets/${name}` }),
    },
    {
      name: 'the route already matches the active project',
      activeProjectName: 'project-a',
      routeProjectName: 'project-a',
      enabled: true,
      getProjectLocation: (name: string) => ({ pathname: `/assets/${name}` }),
    },
    {
      name: 'the target location already matches the current location',
      activeProjectName: 'project-b',
      routeProjectName: 'project-a',
      enabled: true,
      getProjectLocation: () => ({ pathname: '/assets/project-a/models', search: '', hash: '' }),
    },
  ];

  it.each(noNavigationCases)(
    'should not navigate when $name',
    ({ activeProjectName, routeProjectName, enabled, getProjectLocation }) => {
      renderHook(() =>
        useWorkingProjectRouteSync({
          activeProjectName,
          routeProjectName,
          enabled,
          getProjectLocation,
        }),
      );

      expect(navigate).not.toHaveBeenCalled();
    },
  );
});
