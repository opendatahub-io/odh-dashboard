import { act } from 'react';
import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { waitFor } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useAccessReview, useRulesReview, listServices } from '#~/api';
import { ServiceKind } from '#~/k8sTypes';
import {
  useModelRegistryServices,
  ModelRegistryServicesResult,
} from '#~/concepts/modelRegistry/apiHooks/useModelRegistryServices';
import { mockModelRegistryService } from '#~/__mocks__/mockModelRegistryService';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sGetResource: jest.fn(),
}));

jest.mock('#~/api', () => ({
  useAccessReview: jest.fn(),
  useRulesReview: jest.fn(),
  listServices: jest.fn(),
}));

jest.mock('#~/concepts/modelRegistry/apiHooks/useModelRegistryServices', () => ({
  ...jest.requireActual('#~/concepts/modelRegistry/apiHooks/useModelRegistryServices'),
  fetchServices: jest.fn(),
}));

jest.mock('#~/api/useRulesReview', () => ({
  useRulesReview: jest.fn(),
}));

jest.mock('#~/api/useAccessReview');
jest.mock('#~/api/useRulesReview');
const objectToStandardUseFetchState = (obj: ModelRegistryServicesResult) => [
  obj.modelRegistryServices,
  obj.isLoaded,
  obj.error,
  obj.refreshRulesReview,
];

const mockGetResource = jest.mocked(k8sGetResource<ServiceKind>);
const mockListServices = jest.mocked(listServices);

describe('useModelRegistryServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccessReview as jest.Mock).mockReturnValue([false, true]);
    (useRulesReview as jest.Mock).mockReturnValue([{ resourceRules: [] }, true, jest.fn()]);
  });
  it('should return loading state initially', () => {
    const { result } = testHook(() => useModelRegistryServices('namespace'))();

    const [modelRegistryServices, isLoaded, error] = objectToStandardUseFetchState(result.current);

    expect(modelRegistryServices).toEqual([]);
    expect(isLoaded).toBe(false);
    expect(error).toBeUndefined();
  });
  it('returns services fetched by names when allowList is false', async () => {
    (useAccessReview as jest.Mock).mockReturnValue([false, true]);
    (useRulesReview as jest.Mock).mockReturnValue([
      {
        resourceRules: [
          {
            resources: ['services'],
            verbs: ['get'],
            resourceNames: ['service-1', 'service-2'],
          },
        ],
      },
      true,
      jest.fn(),
    ]);
    mockGetResource.mockResolvedValueOnce(
      mockModelRegistryService({ name: 'service-1', namespace: 'test-namespace' }),
    );
    mockGetResource.mockResolvedValueOnce(
      mockModelRegistryService({ name: 'service-2', namespace: 'test-namespace' }),
    );

    const { result } = testHook(() => useModelRegistryServices('test-namespace'))();

    await waitFor(() => {
      const [, isLoaded] = objectToStandardUseFetchState(result.current);
      expect(isLoaded).toBe(true);
    });
    const [services, isLoaded] = objectToStandardUseFetchState(result.current);
    expect(services).toEqual([
      mockModelRegistryService({ name: 'service-1', namespace: 'test-namespace' }),
      mockModelRegistryService({ name: 'service-2', namespace: 'test-namespace' }),
    ]);
    expect(isLoaded).toBe(true);
    expect(mockGetResource).toHaveBeenCalledTimes(2);
    expect(mockGetResource).toHaveBeenCalledWith({
      queryOptions: { name: 'service-1', ns: 'test-namespace' },
    });
    expect(mockGetResource).toHaveBeenCalledWith({
      queryOptions: { name: 'service-2', ns: 'test-namespace' },
    });
  });

  it('should initialize with empty array and loading state', () => {
    const { result } = testHook(() => useModelRegistryServices('namespace'))();
    const [modelRegistryServices, isLoaded, error, refreshRulesReview] =
      objectToStandardUseFetchState(result.current);

    expect(modelRegistryServices).toEqual([]);
    expect(isLoaded).toBe(false);
    expect(error).toBeUndefined();
    expect(refreshRulesReview).toEqual(expect.any(Function));
  });

  it('returns services when allowList is true', async () => {
    (useAccessReview as jest.Mock).mockReturnValue([true, true]);
    (useRulesReview as jest.Mock).mockReturnValue([{ resourceRules: [] }, true, jest.fn()]);
    mockListServices.mockResolvedValue([
      mockModelRegistryService({ name: 'service-1', namespace: 'test-namespace' }),
    ]);

    const { result } = testHook(() => useModelRegistryServices('namespace'))();

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    const [services, isLoaded] = objectToStandardUseFetchState(result.current);
    expect(services).toEqual([
      mockModelRegistryService({ name: 'service-1', namespace: 'test-namespace' }),
    ]);
    expect(isLoaded).toBe(true);
    expect(mockListServices).toHaveBeenCalledTimes(1);
  });

  it('returns empty array if no service names are provided', async () => {
    (useAccessReview as jest.Mock).mockReturnValue([false, true]);
    (useRulesReview as jest.Mock).mockReturnValue([
      {
        resourceRules: [
          {
            resources: ['services'],
            verbs: ['use'],
            resourceNames: [],
          },
        ],
      },
      true,
      jest.fn(),
    ]);

    const { result } = testHook(() => useModelRegistryServices('namespace'))();

    await act(async () => {
      await Promise.resolve();
    });

    const [services, isLoaded] = objectToStandardUseFetchState(result.current);
    expect(services).toEqual([]);
    expect(isLoaded).toBe(true);
    expect(mockGetResource).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    jest.useFakeTimers();
    const mockError = new Error('Test error');
    mockListServices.mockRejectedValue(mockError);
    (useAccessReview as jest.Mock).mockReturnValue([true, true]);
    (useRulesReview as jest.Mock).mockReturnValue([{ resourceRules: [] }, true, jest.fn()]);

    const { result } = testHook(() => useModelRegistryServices('namespace'))();

    await act(async () => {
      jest.runAllTimers();
    });

    const [services, isLoaded, error] = objectToStandardUseFetchState(result.current);

    expect(services).toEqual([]);
    expect(isLoaded).toBe(false);
    expect(error).toBe(mockError);

    jest.useRealTimers();
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
      jest.fn(),
    ]);
    mockGetResource.mockResolvedValue(
      mockModelRegistryService({ name: 'service-1', namespace: 'test-namespace' }),
    );
    const { result } = testHook(() => useModelRegistryServices('namespace'))();
    await act(async () => {
      await Promise.resolve();
    });

    const [services, isLoaded] = objectToStandardUseFetchState(result.current);
    expect(services).toEqual([]);
    expect(isLoaded).toBe(true);
    expect(mockGetResource).toHaveBeenCalledTimes(0);
  });
});
