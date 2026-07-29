import * as React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { ProjectKind } from '@odh-dashboard/k8s-core';
import { FeatureStoreKind } from '../../k8sTypes';
import { listFeatureStores } from '../../api/featureStores';
import useExistingFeatureStores from '../useExistingFeatureStores';

jest.mock('../../api/featureStores', () => ({
  listFeatureStores: jest.fn(),
}));

const listFeatureStoresMock = jest.mocked(listFeatureStores);

const makeProject = (name: string, feastLabeled = true): ProjectKind =>
  ({
    metadata: {
      name,
      annotations: {},
      labels: feastLabeled ? { 'opendatahub.io/feast': 'true' } : {},
    },
  } as unknown as ProjectKind);

const makeStore = (
  name: string,
  namespace: string,
  feastProject: string,
  labels?: Record<string, string>,
): FeatureStoreKind =>
  ({
    apiVersion: 'feast.dev/v1',
    kind: 'FeatureStore',
    metadata: { name, namespace, labels: labels ?? {}, annotations: {} },
    spec: { feastProject },
  } as FeatureStoreKind);

const createWrapper = (projects: ProjectKind[], loaded = true) => {
  const contextValue = {
    projects,
    loaded,
    refresh: jest.fn(),
  } as unknown as React.ContextType<typeof ProjectsContext>;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ProjectsContext.Provider value={contextValue}>{children}</ProjectsContext.Provider>
  );
  Wrapper.displayName = 'ProjectsContextWrapper';
  return Wrapper;
};

describe('useExistingFeatureStores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load feature stores from all project namespaces', async () => {
    const store1 = makeStore('store-1', 'ns-1', 'proj-1');
    const store2 = makeStore('store-2', 'ns-2', 'proj-2');
    listFeatureStoresMock.mockImplementation(async (ns) => (ns === 'ns-1' ? [store1] : [store2]));

    const { result } = renderHook(() => useExistingFeatureStores(), {
      wrapper: createWrapper([makeProject('ns-1'), makeProject('ns-2')]),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.featureStores).toHaveLength(2);
    expect(result.current.error).toBeUndefined();
  });

  it('should extract existingProjectNames and existingResourceNames', async () => {
    const store = makeStore('my-store', 'ns-1', 'my-project');
    listFeatureStoresMock.mockResolvedValue([store]);

    const { result } = renderHook(() => useExistingFeatureStores(), {
      wrapper: createWrapper([makeProject('ns-1')]),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.existingProjectNames).toEqual(['my-project']);
    expect(result.current.existingResourceNames).toEqual(['my-store']);
  });

  it('should identify primaryStore by UI label', async () => {
    const unlabeled = makeStore('store-a', 'ns-1', 'proj-a');
    const labeled = makeStore('store-b', 'ns-1', 'proj-b', { 'feature-store-ui': 'enabled' });
    listFeatureStoresMock.mockResolvedValue([unlabeled, labeled]);

    const { result } = renderHook(() => useExistingFeatureStores(), {
      wrapper: createWrapper([makeProject('ns-1')]),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.hasUILabeledStore).toBe(true);
    expect(result.current.primaryStore?.metadata.name).toBe('store-b');
  });

  it('should fall back to alphabetically first store when no UI label', async () => {
    const storeZ = makeStore('z-store', 'ns-1', 'proj-z');
    const storeA = makeStore('a-store', 'ns-1', 'proj-a');
    listFeatureStoresMock.mockResolvedValue([storeZ, storeA]);

    const { result } = renderHook(() => useExistingFeatureStores(), {
      wrapper: createWrapper([makeProject('ns-1')]),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.hasUILabeledStore).toBe(false);
    expect(result.current.primaryStore?.metadata.name).toBe('a-store');
  });

  it('should surface non-403 partial failures as error', async () => {
    listFeatureStoresMock.mockImplementation(async (ns) => {
      if (ns === 'ns-fail') {
        throw new Error('Internal server error');
      }
      return [makeStore('store-1', ns, 'proj-1')];
    });

    const { result } = renderHook(() => useExistingFeatureStores(), {
      wrapper: createWrapper([makeProject('ns-ok'), makeProject('ns-fail')]),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.featureStores).toHaveLength(1);
    expect(result.current.error?.message).toContain('ns-fail');
  });

  it('should silently skip namespaces with 403 RBAC errors', async () => {
    listFeatureStoresMock.mockImplementation(async (ns) => {
      if (ns === 'ns-forbidden') {
        throw Object.assign(new Error('Forbidden'), { code: 403 });
      }
      return [makeStore('store-1', ns, 'proj-1')];
    });

    const { result } = renderHook(() => useExistingFeatureStores(), {
      wrapper: createWrapper([makeProject('ns-ok'), makeProject('ns-forbidden')]),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.featureStores).toHaveLength(1);
    expect(result.current.error).toBeUndefined();
  });

  it('should skip namespaces without opendatahub.io/feast label', async () => {
    listFeatureStoresMock.mockResolvedValue([makeStore('store-1', 'ns-labeled', 'proj-1')]);

    const { result } = renderHook(() => useExistingFeatureStores(), {
      wrapper: createWrapper([makeProject('ns-labeled', true), makeProject('ns-unlabeled', false)]),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(listFeatureStoresMock).toHaveBeenCalledTimes(1);
    expect(listFeatureStoresMock).toHaveBeenCalledWith('ns-labeled');
  });

  it('should handle unexpected errors in fetchAll', async () => {
    listFeatureStoresMock.mockImplementation(() => {
      throw new Error('unexpected runtime error');
    });

    const { result } = renderHook(() => useExistingFeatureStores(), {
      wrapper: createWrapper([makeProject('ns-1')]),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.error?.message).toBe('unexpected runtime error');
    expect(result.current.featureStores).toEqual([]);
  });

  it('should not fetch when projects are not loaded', () => {
    const { result } = renderHook(() => useExistingFeatureStores(), {
      wrapper: createWrapper([], false),
    });

    expect(result.current.loaded).toBe(false);
    expect(listFeatureStoresMock).not.toHaveBeenCalled();
  });

  it('should support manual refresh', async () => {
    listFeatureStoresMock.mockResolvedValue([makeStore('store-1', 'ns-1', 'proj-1')]);

    const { result } = renderHook(() => useExistingFeatureStores(), {
      wrapper: createWrapper([makeProject('ns-1')]),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(listFeatureStoresMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(listFeatureStoresMock).toHaveBeenCalledTimes(2);
    });
  });
});
