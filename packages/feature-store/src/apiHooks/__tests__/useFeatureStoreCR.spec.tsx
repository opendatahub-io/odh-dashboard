import React from 'react';
import { renderHook } from '@testing-library/react';
import { mockFeatureStore } from '../../__mocks__/mockFeatureStore';
import { FeatureStoreCRContext } from '../../contexts/FeatureStoreContext';
import { useFeatureStoreCR } from '../useFeatureStoreCR';

describe('useFeatureStoreCR', () => {
  const mockFeatureStoreCR = mockFeatureStore({
    name: 'demo',
    namespace: 'default',
  });

  const createWrapper = (
    contextValue: React.ComponentProps<typeof FeatureStoreCRContext.Provider>['value'],
  ) => {
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
      <FeatureStoreCRContext.Provider value={contextValue}>
        {children}
      </FeatureStoreCRContext.Provider>
    );
  };

  it('should return successful feature store CR when CR exists', () => {
    const contextValue = {
      featureStores: [mockFeatureStoreCR],
      activeFeatureStore: mockFeatureStoreCR,
      accessibleProjects: [],
      loaded: true,
      loadError: undefined,
    };

    const wrapper = createWrapper(contextValue);
    const { result } = renderHook(() => useFeatureStoreCR(), { wrapper });

    expect(result.current.data).toEqual(mockFeatureStoreCR);
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('should return null when no CRs exist', () => {
    const contextValue = {
      featureStores: [],
      activeFeatureStore: null,
      accessibleProjects: [],
      loaded: true,
      loadError: undefined,
    };

    const wrapper = createWrapper(contextValue);
    const { result } = renderHook(() => useFeatureStoreCR(), { wrapper });

    expect(result.current.data).toBe(null);
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('should handle errors when API call fails', () => {
    const testError = new Error('Failed to fetch feature store CRs');
    const contextValue = {
      featureStores: [],
      activeFeatureStore: null,
      accessibleProjects: [],
      loaded: false,
      loadError: testError,
    };

    const wrapper = createWrapper(contextValue);
    const { result } = renderHook(() => useFeatureStoreCR(), { wrapper });

    expect(result.current.data).toBe(null);
    expect(result.current.loaded).toBe(false);
    expect(result.current.error).toEqual(testError);
  });

  it('should return the active feature store when multiple CRs exist', () => {
    const secondFeatureStoreCR = {
      ...mockFeatureStoreCR,
      metadata: {
        ...mockFeatureStoreCR.metadata,
        name: 'second-cr',
        uid: 'second-uid',
      },
    };

    const contextValue = {
      featureStores: [mockFeatureStoreCR, secondFeatureStoreCR],
      activeFeatureStore: mockFeatureStoreCR, // The context determines which is active
      accessibleProjects: [],
      loaded: true,
      loadError: undefined,
    };

    const wrapper = createWrapper(contextValue);
    const { result } = renderHook(() => useFeatureStoreCR(), { wrapper });

    expect(result.current.data).toEqual(mockFeatureStoreCR);
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('should be stable when re-rendered with same context values', () => {
    const contextValue = {
      featureStores: [mockFeatureStoreCR],
      activeFeatureStore: mockFeatureStoreCR,
      accessibleProjects: [],
      loaded: true,
      loadError: undefined,
    };

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
    const contextValue = {
      featureStores: [],
      activeFeatureStore: null,
      accessibleProjects: [],
      loaded: false,
      loadError: undefined,
    };

    const wrapper = createWrapper(contextValue);
    const { result } = renderHook(() => useFeatureStoreCR(), { wrapper });

    expect(result.current.data).toBe(null);
    expect(result.current.loaded).toBe(false);
    expect(result.current.error).toBeUndefined();
  });
});
