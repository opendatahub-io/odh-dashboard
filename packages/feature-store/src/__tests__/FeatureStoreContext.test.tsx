/**
 * @jest-environment jsdom
 */
/* eslint-disable camelcase */
import * as React from 'react';
import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { useParams } from 'react-router-dom';
import '@testing-library/jest-dom';
import { FeatureStoreContext, FeatureStoreContextProvider } from '../FeatureStoreContext';
import { useRegistryFeatureStores, RegistryFeatureStore } from '../hooks/useRegistryFeatureStores';
import useFeatureStoreAPIState from '../apiHooks/useFeatureStoreAPIState';
import useFeatureStoreProjectsAPI from '../apiHooks/useFeatureStoreProjectsAPI';
import { FeatureStoreAPIs } from '../types/global';
import { ProjectList } from '../types/featureStoreProjects';
import { DEFAULT_PROJECT_LIST } from '../const';

jest.mock('../hooks/useRegistryFeatureStores');
jest.mock('../apiHooks/useFeatureStoreAPIState');
jest.mock('../apiHooks/useFeatureStoreProjectsAPI');
const mockUseLocation = jest.fn<{ state: { registryNamespace: string } | null }, []>(() => ({
  state: null,
}));
jest.mock('react-router-dom', () => ({
  useParams: jest.fn(() => ({})),
  useLocation: () => mockUseLocation(),
}));
jest.mock('@odh-dashboard/ui-core/components/conditionalArea', () => ({
  conditionalArea: () => (Component: React.ComponentType) => Component,
}));
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  SupportedArea: { FEATURE_STORE: 'FEATURE_STORE' },
}));
jest.mock('../EnsureAPIAvailability', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseRegistryFeatureStores = jest.mocked(useRegistryFeatureStores);
const mockUseFeatureStoreAPIState = jest.mocked(useFeatureStoreAPIState);
const mockUseFeatureStoreProjectsAPI = jest.mocked(useFeatureStoreProjectsAPI);
const mockUseParams = jest.mocked(useParams);

const makeStore = (name: string, namespace = 'test-ns'): RegistryFeatureStore => ({
  name,
  project: 'test-project',
  registry: { path: 'registry.svc:443' },
  namespace,
  status: {
    conditions: [{ type: 'Ready', status: 'True', lastTransitionTime: '2025-01-01T00:00:00Z' }],
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FeatureStoreContextProvider>{children}</FeatureStoreContextProvider>
);

const useContextHook = () => React.useContext(FeatureStoreContext);

describe('FeatureStoreContext — activeFeatureStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseFeatureStoreAPIState.mockReturnValue([
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      { apiAvailable: false, api: null as unknown as FeatureStoreAPIs },
      jest.fn(),
    ]);

    mockUseFeatureStoreProjectsAPI.mockReturnValue({
      data: DEFAULT_PROJECT_LIST,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  const setupStores = (featureStores: RegistryFeatureStore[]) => {
    mockUseRegistryFeatureStores.mockReturnValue({
      featureStores,
      enabledCRDCount: featureStores.length,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
  };

  it('returns null when no feature stores are available', () => {
    setupStores([]);
    const { result } = renderHook(useContextHook, { wrapper });
    expect(result.current.activeFeatureStore).toBeNull();
  });

  it('returns the first store when no store is explicitly selected', () => {
    setupStores([makeStore('store-a'), makeStore('store-b')]);
    const { result } = renderHook(useContextHook, { wrapper });
    expect(result.current.activeFeatureStore?.name).toBe('store-a');
  });

  it('returns the named store when explicitly selected', () => {
    setupStores([makeStore('store-a'), makeStore('store-b')]);
    const { result } = renderHook(useContextHook, { wrapper });

    act(() => {
      result.current.setCurrentFeatureStore('store-b');
    });

    expect(result.current.activeFeatureStore?.name).toBe('store-b');
  });

  it('falls back to the first store when the selected store no longer exists', () => {
    setupStores([makeStore('store-a'), makeStore('store-b')]);
    const { result, rerender } = renderHook(useContextHook, { wrapper });

    act(() => {
      result.current.setCurrentFeatureStore('store-b');
    });
    expect(result.current.activeFeatureStore?.name).toBe('store-b');

    // store-b disappears from the cluster
    setupStores([makeStore('store-a')]);
    rerender();

    expect(result.current.activeFeatureStore?.name).toBe('store-a');
  });

  it('selects the matching store when navRegistryNamespace is provided', () => {
    mockUseLocation.mockReturnValue({ state: { registryNamespace: 'ns-b' } });
    setupStores([makeStore('store-a', 'ns-a'), makeStore('store-b', 'ns-b')]);

    const { result } = renderHook(useContextHook, { wrapper });
    expect(result.current.activeFeatureStore?.name).toBe('store-b');
  });

  it('falls back to the first store when navRegistryNamespace does not match', () => {
    mockUseLocation.mockReturnValue({ state: { registryNamespace: 'ns-unknown' } });
    setupStores([makeStore('store-a', 'ns-a'), makeStore('store-b', 'ns-b')]);

    const { result } = renderHook(useContextHook, { wrapper });
    expect(result.current.activeFeatureStore?.name).toBe('store-a');
  });
});

const apiProjectList: ProjectList = {
  projects: [
    {
      spec: { name: 'api-project' },
      meta: {
        createdTimestamp: '2025-01-01T00:00:00Z',
        lastUpdatedTimestamp: '2025-01-01T00:00:00Z',
      },
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    total_count: 1,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  },
};

const mockApi = {
  getEntities: jest.fn(),
  listFeatureStoreProject: jest.fn(),
} as unknown as FeatureStoreAPIs;

const bootstrapContext = ({
  apiAvailable = true,
  registryLoaded = true,
  registryError,
  projectsLoaded = true,
  projectsError,
  refreshRegistry = jest.fn(),
  refreshProjects = jest.fn().mockResolvedValue(undefined),
}: {
  apiAvailable?: boolean;
  registryLoaded?: boolean;
  registryError?: Error;
  projectsLoaded?: boolean;
  projectsError?: Error;
  refreshRegistry?: () => Promise<void>;
  refreshProjects?: () => Promise<ProjectList | undefined>;
} = {}) => {
  mockUseLocation.mockReturnValue({ state: null });
  mockUseParams.mockReturnValue({});
  mockUseRegistryFeatureStores.mockReturnValue({
    featureStores: [makeStore('store-a')],
    enabledCRDCount: 1,
    loaded: registryLoaded,
    error: registryError,
    refresh: refreshRegistry,
  });
  mockUseFeatureStoreAPIState.mockReturnValue([{ apiAvailable, api: mockApi }, jest.fn()]);
  mockUseFeatureStoreProjectsAPI.mockReturnValue({
    data: apiProjectList,
    loaded: projectsLoaded,
    error: projectsError,
    refresh: refreshProjects,
  });
};

describe('FeatureStoreContext — API state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bootstrapContext();
  });

  it('exposes the API state provided by useFeatureStoreAPIState', () => {
    const { result } = renderHook(useContextHook, { wrapper });

    expect(result.current.apiState.apiAvailable).toBe(true);
    expect(result.current.apiState.api).toBe(mockApi);
  });

  it('exposes the refreshAPIState callback from useFeatureStoreAPIState', () => {
    const refreshAPIState = jest.fn();
    mockUseFeatureStoreAPIState.mockReturnValue([
      { apiAvailable: false, api: mockApi },
      refreshAPIState,
    ]);

    const { result } = renderHook(useContextHook, { wrapper });

    expect(result.current.refreshAPIState).toBe(refreshAPIState);
  });

  it('reports loaded only once both the registry and the projects are loaded', () => {
    bootstrapContext({ registryLoaded: true, projectsLoaded: false });
    const { result, rerender } = renderHook(useContextHook, { wrapper });

    expect(result.current.loaded).toBe(false);

    bootstrapContext({ registryLoaded: true, projectsLoaded: true });
    rerender();

    expect(result.current.loaded).toBe(true);
  });

  it('stays unloaded while only the projects have loaded', () => {
    bootstrapContext({ registryLoaded: false, projectsLoaded: true });
    const { result } = renderHook(useContextHook, { wrapper });

    expect(result.current.loaded).toBe(false);
  });

  it('reflects the API becoming available after a rerender', () => {
    bootstrapContext({ apiAvailable: false });
    const { result, rerender } = renderHook(useContextHook, { wrapper });

    expect(result.current.apiState.apiAvailable).toBe(false);

    bootstrapContext({ apiAvailable: true });
    rerender();

    expect(result.current.apiState.apiAvailable).toBe(true);
  });

  it('surfaces the registry error as loadError', () => {
    const registryError = new Error('registry unavailable');
    bootstrapContext({ registryError });

    const { result } = renderHook(useContextHook, { wrapper });

    expect(result.current.loadError).toBe(registryError);
  });

  it('surfaces the projects error as loadError when the registry has no error', () => {
    const projectsError = new Error('projects unavailable');
    bootstrapContext({ projectsError });

    const { result } = renderHook(useContextHook, { wrapper });

    expect(result.current.loadError).toBe(projectsError);
  });
});

describe('FeatureStoreContext — project management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bootstrapContext();
  });

  it('falls back to DEFAULT_PROJECT_LIST when no provider supplies projects', () => {
    const { result } = renderHook(useContextHook);

    expect(result.current.featureStoreProjects).toBe(DEFAULT_PROJECT_LIST);
    expect(result.current.featureStoreProjectsLoaded).toBe(false);
  });

  it('sets the active and preferred project through setCurrentProject', () => {
    const { result } = renderHook(useContextHook, { wrapper });

    act(() => {
      result.current.setCurrentProject('api-project');
    });

    expect(result.current.currentProject).toBe('api-project');
    expect(result.current.preferredFeatureStoreProject).toBe('api-project');
  });

  it('clears the preferred project when setCurrentProject is called without a project', () => {
    const { result } = renderHook(useContextHook, { wrapper });

    act(() => {
      result.current.setCurrentProject('api-project');
    });
    expect(result.current.preferredFeatureStoreProject).toBe('api-project');

    act(() => {
      result.current.setCurrentProject();
    });

    expect(result.current.currentProject).toBeUndefined();
    expect(result.current.preferredFeatureStoreProject).toBeNull();
  });

  it('prefers the project from the route over the preferred project', () => {
    mockUseParams.mockReturnValue({ fsProjectName: 'route-project' });

    const { result } = renderHook(useContextHook, { wrapper });

    act(() => {
      result.current.setCurrentProject('api-project');
    });

    expect(result.current.preferredFeatureStoreProject).toBe('api-project');
    expect(result.current.currentProject).toBe('route-project');
  });
});

describe('FeatureStoreContext — refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bootstrapContext();
  });

  it('delegates refresh to the registry refresh', async () => {
    const refreshRegistry = jest.fn().mockResolvedValue(undefined);
    bootstrapContext({ refreshRegistry });

    const { result } = renderHook(useContextHook, { wrapper });

    await act(async () => {
      await result.current.refresh();
    });

    expect(refreshRegistry).toHaveBeenCalledTimes(1);
  });

  it('delegates refreshFeatureStoreProjects to the projects refresh', () => {
    const refreshProjects = jest.fn().mockResolvedValue(undefined);
    bootstrapContext({ refreshProjects });

    const { result } = renderHook(useContextHook, { wrapper });

    // The mount effect already refreshes the projects once; isolate the manual call.
    refreshProjects.mockClear();

    act(() => {
      result.current.refreshFeatureStoreProjects();
    });

    expect(refreshProjects).toHaveBeenCalledTimes(1);
  });

  it('does not re-fetch the projects while the API is unavailable', () => {
    const refreshProjects = jest.fn().mockResolvedValue(undefined);
    bootstrapContext({ apiAvailable: false, refreshProjects });

    renderHook(useContextHook, { wrapper });

    expect(refreshProjects).toHaveBeenCalledTimes(0);
  });

  it('re-fetches the projects once the API is available for the active store', () => {
    const refreshProjects = jest.fn().mockResolvedValue(undefined);
    bootstrapContext({ apiAvailable: true, refreshProjects });

    renderHook(useContextHook, { wrapper });

    expect(refreshProjects).toHaveBeenCalledTimes(1);
  });
});
