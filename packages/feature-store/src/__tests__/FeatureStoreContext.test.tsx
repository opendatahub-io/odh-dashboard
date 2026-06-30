/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { act } from 'react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FeatureStoreContext, FeatureStoreContextProvider } from '../FeatureStoreContext';
import { useRegistryFeatureStores, RegistryFeatureStore } from '../hooks/useRegistryFeatureStores';
import useFeatureStoreAPIState from '../apiHooks/useFeatureStoreAPIState';
import useFeatureStoreProjectsAPI from '../apiHooks/useFeatureStoreProjectsAPI';
import { FeatureStoreAPIs } from '../types/global';
import { DEFAULT_PROJECT_LIST } from '../const';

jest.mock('../hooks/useRegistryFeatureStores');
jest.mock('../apiHooks/useFeatureStoreAPIState');
jest.mock('../apiHooks/useFeatureStoreProjectsAPI');
jest.mock('react-router-dom', () => ({ useParams: jest.fn(() => ({})) }));
jest.mock('@odh-dashboard/internal/concepts/areas/AreaComponent', () => ({
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
});
