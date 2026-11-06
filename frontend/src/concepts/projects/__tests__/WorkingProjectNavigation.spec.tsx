import { runInThisContext } from 'node:vm';
import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  createMemoryRouter,
  RouterProvider,
  Outlet,
} from 'react-router-dom';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import {
  useWorkingProject,
  type WorkingProjectNavigation,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { PREFERRED_NAMESPACE_STORAGE_KEY as key } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { useProjects } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';
import ProjectsContextProvider from '#~/concepts/projects/ProjectsContext';
import ProjectSelectorNavigator from '#~/concepts/projects/ProjectSelectorNavigator';
import useSyncPreferredProject from '#~/concepts/projects/useSyncPreferredProject';
import NavigationBlockerModal from '#~/components/NavigationBlockerModal';

jest.mock('#~/api', () => ({ useProjects: jest.fn() }));
jest.mock('#~/redux/selectors', () => ({ useDashboardNamespace: jest.fn() }));
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core/components/projectSelector/ProjectSelector', () => ({
  __esModule: true,
  default: () => null,
}));

const projects = ['a', 'b'].map((k8sName) => mockProjectK8sResource({ k8sName }));
let location: ReturnType<typeof useLocation>;
let navigate: ReturnType<typeof useNavigate>;
let working: ReturnType<typeof useWorkingProject>;

const Observer: React.FC = () => {
  location = useLocation();
  navigate = useNavigate();
  working = useWorkingProject();
  return null;
};

const TabObserver: React.FC<{ label: string }> = ({ label }) => {
  const { pathname } = useLocation();
  const { activeProject } = useWorkingProject();
  return <span data-testid={label}>{`${pathname}:${activeProject?.name ?? 'none'}`}</span>;
};

const Surface: React.FC<{ query?: boolean; viewed?: boolean; withoutAdapter?: boolean }> = ({
  query,
  viewed,
  withoutAdapter,
}) => {
  const { namespace } = useParams();
  const { search, hash } = useLocation();
  const name = query ? new URLSearchParams(search).get('workspace') : namespace;
  useSyncPreferredProject(projects.find(({ metadata }) => metadata.name === name) ?? null, viewed);
  if (withoutAdapter) {
    return null;
  }
  return (
    <ProjectSelectorNavigator
      syncWorkingProject={!viewed}
      queryParamNamespace={query ? 'workspace' : undefined}
      getRedirectPath={(projectName) => {
        const parameters = new URLSearchParams(search);
        parameters.delete('resource');
        if (query) {
          parameters.set('workspace', projectName);
        }
        const suffix = parameters.toString();
        return `${query ? '/workspace' : `/models/${encodeURIComponent(projectName)}`}${
          suffix ? `?${suffix}` : ''
        }${hash}`;
      }}
    />
  );
};

const tree = (entry = '/models/a?filter=ready#results') => (
  <MemoryRouter initialEntries={['/global', entry]}>
    <ProjectsContextProvider>
      <Observer />
      <Routes>
        <Route path="/global" element={<span>Global</span>} />
        <Route path="/models/:namespace" element={<Surface />} />
        <Route path="/workspace" element={<Surface query />} />
        <Route path="/projects/:namespace" element={<Surface viewed />} />
        <Route path="/legacy/:namespace" element={<Surface withoutAdapter />} />
      </Routes>
    </ProjectsContextProvider>
  </MemoryRouter>
);

const BlockedLayout: React.FC = () => (
  <ProjectsContextProvider>
    <Observer />
    <NavigationBlockerModal hasUnsavedChanges />
    <Outlet />
  </ProjectsContextProvider>
);

const blockedTree = () => {
  const router = createMemoryRouter(
    [
      {
        element: <BlockedLayout />,
        children: [{ path: '/models/:namespace', element: <Surface /> }],
      },
    ],
    { initialEntries: ['/models/a'] },
  );
  return <RouterProvider router={router} />;
};

const RegisteredAdapter: React.FC<{ onNavigate: WorkingProjectNavigation }> = ({ onNavigate }) => {
  const { registerProjectNavigation } = useWorkingProject();
  React.useLayoutEffect(
    () => registerProjectNavigation?.(onNavigate),
    [registerProjectNavigation, onNavigate],
  );
  return null;
};

const synchronize = (name: string) => {
  localStorage.setItem(key, JSON.stringify(name));
  act(() =>
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        newValue: JSON.stringify(name),
        storageArea: localStorage,
      }),
    ),
  );
};

describe('working-project external navigation', () => {
  const requestDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Request');
  beforeAll(() => {
    // jsdom does not expose Node 22's native Request, required by data-router navigation.
    Object.defineProperty(globalThis, 'Request', {
      configurable: true,
      value: runInThisContext('Request'),
    });
  });
  afterAll(() => {
    if (requestDescriptor) {
      Object.defineProperty(globalThis, 'Request', requestDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'Request');
    }
  });
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(key, '"a"');
    jest.mocked(useProjects).mockReturnValue([projects, true, undefined]);
    jest
      .mocked(useDashboardNamespace)
      .mockReturnValue({ dashboardNamespace: 'dashboard' } as ReturnType<
        typeof useDashboardNamespace
      >);
    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: true } as ReturnType<typeof useIsAreaAvailable>);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should keep the original selection while blocked and commit only after discard', async () => {
    render(blockedTree());
    synchronize('b');
    await screen.findByTestId('navigation-blocker-modal');
    expect(location.pathname).toBe('/models/a');
    expect(working.activeProject?.name).toBe('a');
    fireEvent.click(screen.getByTestId('confirm-discard-changes'));
    await waitFor(() => expect(location.pathname).toBe('/models/b'));
    expect(working.activeProject?.name).toBe('b');
  });

  it('should abort a pending loader when a newer switch returns to the displayed project', async () => {
    let complete: () => void = () => undefined;
    const delayed = new Promise<null>((resolve) => {
      complete = () => resolve(null);
    });
    let pendingSignal: AbortSignal | undefined;
    const router = createMemoryRouter(
      [
        {
          element: (
            <ProjectsContextProvider>
              <Observer />
              <Outlet />
            </ProjectsContextProvider>
          ),
          children: [
            {
              path: '/models/:namespace',
              element: <Surface />,
              hydrateFallbackElement: null,
              loader: ({ params, request }) => {
                if (params.namespace === 'b') {
                  pendingSignal = request.signal;
                  return delayed;
                }
                return null;
              },
            },
          ],
        },
      ],
      { initialEntries: ['/models/a'] },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(working.activeProject?.name).toBe('a'));
    synchronize('b');
    await waitFor(() => expect(pendingSignal).toBeDefined());
    expect(pendingSignal?.aborted).toBe(false);
    expect(router.state.navigation.location?.pathname).toBe('/models/b');
    expect(location.pathname).toBe('/models/a');
    synchronize('a');
    await waitFor(() => expect(router.state.navigation.state).toBe('idle'));
    expect(pendingSignal?.aborted).toBe(true);
    await act(async () => complete());
    expect(location.pathname).toBe('/models/a');
    expect(working.activeProject?.name).toBe('a');
    expect(localStorage.getItem(key)).toBe('"a"');
    expect(router.state.historyAction).toBe('REPLACE');
    // An aborted transition must not prevent a later legitimate switch.
    synchronize('b');
    await waitFor(() => expect(location.pathname).toBe('/models/b'));
    expect(working.activeProject?.name).toBe('b');
  });

  it('should reset a blocked destination when superseded by the current project', async () => {
    render(blockedTree());
    synchronize('b');
    await screen.findByTestId('navigation-blocker-modal');
    synchronize('a');
    await waitFor(() =>
      expect(screen.queryByTestId('navigation-blocker-modal')).not.toBeInTheDocument(),
    );
    expect(location.pathname).toBe('/models/a');
    expect(working.activeProject?.name).toBe('a');
    expect(localStorage.getItem(key)).toBe('"a"');
    // The next switch must still require consent and must not inherit the obsolete callback.
    synchronize('b');
    fireEvent.click(await screen.findByTestId('confirm-discard-changes'));
    await waitFor(() => expect(location.pathname).toBe('/models/b'));
    expect(working.activeProject?.name).toBe('b');
  });

  it('should discard only the newest blocked destination', async () => {
    jest
      .mocked(useProjects)
      .mockReturnValue([[...projects, mockProjectK8sResource({ k8sName: 'c' })], true, undefined]);
    render(blockedTree());
    synchronize('b');
    await screen.findByTestId('navigation-blocker-modal');
    synchronize('c');
    fireEvent.click(await screen.findByTestId('confirm-discard-changes'));
    await waitFor(() => expect(location.pathname).toBe('/models/c'));
    expect(working.activeProject?.name).toBe('c');
    expect(localStorage.getItem(key)).toBe('"c"');
  });

  it('should abandon blocked navigation when the project source becomes unavailable', async () => {
    const { rerender } = render(blockedTree());
    synchronize('b');
    await screen.findByTestId('navigation-blocker-modal');
    jest.mocked(useProjects).mockReturnValue([projects, false, undefined]);
    rerender(blockedTree());
    await waitFor(() =>
      expect(screen.queryByTestId('navigation-blocker-modal')).not.toBeInTheDocument(),
    );
    expect(location.pathname).toBe('/models/a');
    expect(working.activeProject).toBeNull();
  });

  it('should cancel a blocked switch without leaving route synchronization suppressed', async () => {
    render(blockedTree());
    synchronize('b');
    await screen.findByTestId('navigation-blocker-modal');
    fireEvent.click(screen.getByTestId('cancel-discard-changes'));
    expect(location.pathname).toBe('/models/a');
    expect(working.activeProject?.name).toBe('a');
    act(() => working.selectProject({ name: 'b' }));
    expect(working.activeProject?.name).toBe('a');
  });

  it('should restore the previous registered adapter when the newest adapter unmounts', () => {
    const first = jest.fn();
    const second = jest.fn();
    const view = (showSecond: boolean) => (
      <MemoryRouter>
        <ProjectsContextProvider>
          <Observer />
          <RegisteredAdapter onNavigate={first} />
          {showSecond && <RegisteredAdapter onNavigate={second} />}
        </ProjectsContextProvider>
      </MemoryRouter>
    );
    const { rerender } = render(view(true));
    synchronize('b');
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(working.activeProject?.name).toBe('a');
    rerender(view(false));
    synchronize('b');
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('should ignore an obsolete transaction commit after a newer switch', () => {
    const onNavigate = jest.fn();
    render(
      <MemoryRouter>
        <ProjectsContextProvider>
          <Observer />
          <RegisteredAdapter onNavigate={onNavigate} />
        </ProjectsContextProvider>
      </MemoryRouter>,
    );
    synchronize('b');
    synchronize('a');
    act(() => onNavigate.mock.calls[0][1].commit());
    expect(working.activeProject?.name).toBe('a');
    expect(localStorage.getItem(key)).toBe('"a"');
  });

  it('should reject commits from an adapter that has unmounted', () => {
    const onNavigate = jest.fn();
    const view = (mounted: boolean) => (
      <MemoryRouter>
        <ProjectsContextProvider>
          <Observer />
          {mounted && <RegisteredAdapter onNavigate={onNavigate} />}
        </ProjectsContextProvider>
      </MemoryRouter>
    );
    const { rerender } = render(view(true));
    synchronize('b');
    rerender(view(false));
    act(() => onNavigate.mock.calls[0][1].commit());
    expect(working.activeProject?.name).toBe('a');
  });

  it('should replace a surface URL and not let the old route reassert its project', async () => {
    render(tree());
    synchronize('b');
    await waitFor(() => expect(location.pathname).toBe('/models/b'));
    expect(location.search).toBe('?filter=ready');
    expect(location.hash).toBe('#results');
    expect(working.activeProject?.name).toBe('b');
    expect(localStorage.getItem(key)).toBe('"b"');
    act(() => navigate(-1));
    expect(location.pathname).toBe('/global');
  });

  it('should preserve query compatibility and unrelated filters', async () => {
    render(tree('/workspace?workspace=a&filter=ready'));
    synchronize('b');
    await waitFor(() => expect(new URLSearchParams(location.search).get('workspace')).toBe('b'));
    expect(new URLSearchParams(location.search).get('filter')).toBe('ready');
    expect(location.pathname).toBe('/workspace');
    expect(working.activeProject?.name).toBe('b');
  });

  it('should let the surface discard previous-project resource parameters', () => {
    render(tree('/models/a?filter=ready&resource=old-resource'));
    synchronize('b');
    expect(location.pathname).toBe('/models/b');
    expect(location.search).toBe('?filter=ready');
  });

  it('should not let registration capability disable synchronization on an unmigrated route', () => {
    render(tree('/legacy/a'));
    act(() => working.selectProject({ name: 'b' }));
    expect(location.pathname).toBe('/legacy/a');
    expect(working.activeProject?.name).toBe('a');
  });

  it('should not ping-pong storage between two detail tabs without navigation adapters', () => {
    render(
      <>
        {(['a', 'b'] as const).map((name) => (
          <MemoryRouter key={name} initialEntries={[`/legacy/${name}`]}>
            <ProjectsContextProvider>
              <TabObserver label={`tab-${name}`} />
              <Routes>
                <Route path="/legacy/:namespace" element={<Surface withoutAdapter />} />
              </Routes>
            </ProjectsContextProvider>
          </MemoryRouter>
        ))}
      </>,
    );
    const assertTabs = () => {
      expect(screen.getByTestId('tab-a')).toHaveTextContent('/legacy/a:a');
      expect(screen.getByTestId('tab-b')).toHaveTextContent('/legacy/b:b');
    };
    assertTabs();
    synchronize('a');
    assertTabs();
    expect(localStorage.getItem(key)).toBe('"a"');
    synchronize('b');
    assertTabs();
    expect(localStorage.getItem(key)).toBe('"b"');
  });

  it('should give the entry URL precedence over conflicting storage', () => {
    localStorage.setItem(key, '"b"');
    render(tree('/models/a'));
    expect(working.activeProject?.name).toBe('a');
    expect(localStorage.getItem(key)).toBe('"a"');
  });

  it('should leave viewed-project URLs independent from external working-project changes', () => {
    render(tree('/projects/a'));
    synchronize('b');
    expect(location.pathname).toBe('/projects/a');
    expect(working.activeProject?.name).toBe('b');
  });

  it('should not navigate for unknown projects or with UPS disabled', () => {
    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: false } as ReturnType<typeof useIsAreaAvailable>);
    render(tree());
    synchronize('b');
    expect(location.pathname).toBe('/models/a');
    expect(working.status).toBe('provider-absent');
  });

  it('should preserve URL authority for browser Back and Forward', async () => {
    render(tree('/models/a'));
    act(() => navigate('/models/b'));
    await waitFor(() => expect(working.activeProject?.name).toBe('b'));
    act(() => navigate(-1));
    await waitFor(() => expect(working.activeProject?.name).toBe('a'));
    act(() => navigate(1));
    await waitFor(() => expect(working.activeProject?.name).toBe('b'));
  });

  it('should unregister the previous surface when entering a global page', () => {
    render(tree());
    act(() => navigate('/global'));
    synchronize('b');
    expect(location.pathname).toBe('/global');
    expect(working.activeProject?.name).toBe('b');
  });

  it('should ignore unknown external projects without navigating or rewriting persistence', () => {
    render(tree());
    synchronize('missing');
    expect(location.pathname).toBe('/models/a');
    expect(working.activeProject?.name).toBe('a');
    expect(localStorage.getItem(key)).toBe('"missing"');
  });
});
