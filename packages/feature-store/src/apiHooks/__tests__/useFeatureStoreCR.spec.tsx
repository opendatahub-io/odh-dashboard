import React from 'react';
import { renderHook } from '@testing-library/react';
import { FeatureStoreContext } from '../../FeatureStoreContext';
import { useFeatureStoreCR } from '../useFeatureStoreCR';
import { RegistryFeatureStore } from '../../hooks/useRegistryFeatureStores';
import { FeatureStoreAPIs } from '../../types/global';

describe('useFeatureStoreCR', () => {
  const mockFeatureStoreCR: RegistryFeatureStore = {
    name: 'demo',
    project: 'demo',
    registry: {
      path: '/api/featurestores/default/demo',
    },
    namespace: 'default',
    status: {
      conditions: [
        {
          type: 'Ready',
          status: 'True',
          lastTransitionTime: '2025-07-02T12:43:32Z',
        },
      ],
    },
  };

  const createWrapper = (
    contextValue: React.ComponentProps<typeof FeatureStoreContext.Provider>['value'],
  ) => {
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
      <FeatureStoreContext.Provider value={contextValue}>{children}</FeatureStoreContext.Provider>
    );
  };

  const createMockContextValue = (
    overrides: Partial<React.ComponentProps<typeof FeatureStoreContext.Provider>['value']> = {},
  ) => ({
    featureStores: [],
    activeFeatureStore: null,
    loaded: false,
    loadError: undefined,
    refresh: async () => {
      // Mock implementation
    },
    selectedFeatureStoreName: null,
    setCurrentFeatureStore: () => {
      // Mock implementation
    },
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    apiState: { apiAvailable: false, api: null as unknown as FeatureStoreAPIs },
    refreshAPIState: () => {
      // Mock implementation
    },
    currentProject: undefined,
    setCurrentProject: () => {
      // Mock implementation
    },
    preferredFeatureStoreProject: null,
    updatePreferredFeatureStoreProject: () => {
      // Mock implementation
    },
    featureStoreProjects: {
      projects: [],
      pagination: {
        page: 1,
        limit: 10,
        // eslint-disable-next-line camelcase
        total_count: 0,
        // eslint-disable-next-line camelcase
        total_pages: 0,
        // eslint-disable-next-line camelcase
        has_next: false,
        // eslint-disable-next-line camelcase
        has_previous: false,
      },
    },
    featureStoreProjectsLoaded: false,
    featureStoreProjectsError: undefined,
    refreshFeatureStoreProjects: () => {
      // Mock implementation
    },
    ...overrides,
  });

  it('should return successful feature store CR when CR exists', () => {
    const contextValue = createMockContextValue({
      featureStores: [mockFeatureStoreCR],
      activeFeatureStore: mockFeatureStoreCR,
      loaded: true,
      loadError: undefined,
    });

    const wrapper = createWrapper(contextValue);
    const { result } = renderHook(() => useFeatureStoreCR(), { wrapper });

    expect(result.current.data).toEqual(mockFeatureStoreCR);
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('should return null when no CRs exist', () => {
    const contextValue = createMockContextValue({
      featureStores: [],
      activeFeatureStore: null,
      loaded: true,
      loadError: undefined,
    });

    const wrapper = createWrapper(contextValue);
    const { result } = renderHook(() => useFeatureStoreCR(), { wrapper });

    expect(result.current.data).toBe(null);
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('should handle errors when API call fails', () => {
    const testError = new Error('Failed to fetch feature store CRs');
    const contextValue = createMockContextValue({
      featureStores: [],
      activeFeatureStore: null,
      loaded: false,
      loadError: testError,
    });

    const wrapper = createWrapper(contextValue);
    const { result } = renderHook(() => useFeatureStoreCR(), { wrapper });

    expect(result.current.data).toBe(null);
    expect(result.current.loaded).toBe(false);
    expect(result.current.error).toEqual(testError);
  });

  it('should return the active feature store when multiple CRs exist', () => {
    const secondFeatureStoreCR: RegistryFeatureStore = {
      ...mockFeatureStoreCR,
      name: 'second-cr',
    };

    const contextValue = createMockContextValue({
      featureStores: [mockFeatureStoreCR, secondFeatureStoreCR],
      activeFeatureStore: mockFeatureStoreCR, // The context determines which is active
      loaded: true,
      loadError: undefined,
    });

    const wrapper = createWrapper(contextValue);
    const { result } = renderHook(() => useFeatureStoreCR(), { wrapper });

    expect(result.current.data).toEqual(mockFeatureStoreCR);
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('should be stable when re-rendered with same context values', () => {
    const contextValue = createMockContextValue({
      featureStores: [mockFeatureStoreCR],
      activeFeatureStore: mockFeatureStoreCR,
      loaded: true,
      loadError: undefined,
    });

    const wrapper = createWrapper(contextValue);
    const { result, rerender } = renderHook(() => useFeatureStoreCR(), { wrapper });

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    // The result should be memoized and stable
    expect(firstResult).toBe(secondResult);
    expect(result.current.data).toEqual(mockFeatureStoreCR);
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('should handle loading state', () => {
    const contextValue = createMockContextValue({
      featureStores: [],
      activeFeatureStore: null,
      loaded: false,
      loadError: undefined,
    });

    const wrapper = createWrapper(contextValue);
    const { result } = renderHook(() => useFeatureStoreCR(), { wrapper });

    expect(result.current.data).toBe(null);
    expect(result.current.loaded).toBe(false);
    expect(result.current.error).toBeUndefined();
  });
});
