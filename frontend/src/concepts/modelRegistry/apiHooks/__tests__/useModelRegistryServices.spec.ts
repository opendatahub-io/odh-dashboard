import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { act } from 'react-dom/test-utils';
import { useAccessReview, useRulesReview, listServices } from '~/api';
import { ServiceKind } from '~/k8sTypes';
import { useModelRegistryServices } from '~/concepts/modelRegistry/apiHooks/useModelRegistryServices';
import { standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';
import { mockModelRegistryService } from '~/__mocks__/mockModelRegistryService';
import { ModelRegistryServicesResult } from '../useModelRegistryServices'; // Make sure this import exists

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sGetResource: jest.fn(),
}));

jest.mock('~/api', () => ({
  useAccessReview: jest.fn(),
  useRulesReview: jest.fn(),
  listServices: jest.fn(),
}));

jest.mock('~/concepts/modelRegistry/apiHooks/useModelRegistryServices', () => ({
  ...jest.requireActual('~/concepts/modelRegistry/apiHooks/useModelRegistryServices'),
  fetchServices: jest.fn(),
}));

jest.mock('~/api/useRulesReview', () => ({
  useRulesReview: jest.fn(),
}));

const mockGetResource = jest.mocked(k8sGetResource<ServiceKind>);
const mockListServices = jest.mocked(listServices);

describe('useModelRegistryServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty array and loading state', () => {
    const { result } = testHook(() => useModelRegistryServices(true));
    
    const [services, isLoading, error, refresh] = result.current as ModelRegistryServicesResult;
    
    expect(services).toEqual([]);
    expect(isLoading).toBe(false);
    expect(error).toBeUndefined();
    expect(refresh).toBeInstanceOf(Function);
  });

  it('returns services when allowList is true', async () => {
    (useAccessReview as jest.Mock).mockReturnValue([true, true]);
    (useRulesReview as jest.Mock).mockReturnValue([{}, false]);
    (useRulesReview as jest.Mock).mockReturnValue([
      { incomplete: false, nonResourceRules: [], resourceRules: [] },
      true,
      jest.fn(),
    ]);
    mockListServices.mockResolvedValue([
      mockModelRegistryService({ name: 'service-1', namespace: 'test-namespace' }),
    ]);

    const renderResult = testHook(useModelRegistryServices)();
    expect(mockListServices).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockListServices).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(
        [mockModelRegistryService({ name: 'service-1', namespace: 'test-namespace' })],
        true,
      ),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    mockListServices.mockResolvedValue([
      mockModelRegistryService({ name: 'service-1', namespace: 'test-namespace' }),
    ]);
    await act(() => renderResult.result.current[3]());
    expect(mockListServices).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('returns services fetched by names when allowList is false', async () => {
    (useAccessReview as jest.Mock).mockReturnValue([false, true]);
    (useRulesReview as jest.Mock).mockReturnValue([
      {
        resourceRules: [
          {
            resources: ['services'],
            verbs: ['get'],
            resourceNames: ['service-1'],
          },
        ],
      },
      true,
    ]);
    mockGetResource.mockResolvedValue(
      mockModelRegistryService({ name: 'service-1', namespace: 'test-namespace' }),
    );

    const renderResult = testHook(useModelRegistryServices)();
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(
        [mockModelRegistryService({ name: 'service-1', namespace: 'test-namespace' })],
        true,
      ),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    mockGetResource.mockResolvedValue(mockModelRegistryService({}));
    await act(() => renderResult.result.current[3]());
    expect(mockGetResource).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  test('returns empty array if no service names are provided', async () => {
    (useAccessReview as jest.Mock).mockReturnValue([false, true]);
    (useRulesReview as jest.Mock).mockReturnValue([
      {
        resourceRules: [
          {
            resources: ['services'],
            verbs: ['use'],
            resourceNames: ['service-1'],
          },
        ],
      },
      true,
    ]);
    mockGetResource.mockResolvedValue(
      mockModelRegistryService({ name: 'service-1', namespace: 'test-namespace' }),
    );
    const renderResult = testHook(useModelRegistryServices)();
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current[0]).toEqual([]);
    expect(renderResult.result.current[1]).toBe(true);
    expect(mockGetResource).toHaveBeenCalledTimes(0);
  });

  it('should handle errors', async () => {
    // ... existing setup ...

    const renderResult = testHook(() => useModelRegistryServices());
    
    const [, , , refresh] = renderResult.result.current as ModelRegistryServicesResult;

    await act(() => refresh());

    const [services, isLoading, error] = renderResult.result.current as ModelRegistryServicesResult;
    
    expect(services).toEqual([]);
    expect(isLoading).toBe(false);
    expect(error).toBeDefined();
  });
});
