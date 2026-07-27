import { testHook } from '@odh-dashboard/jest-config/hooks';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import * as reduxSelectors from '@odh-dashboard/internal/redux/selectors/project';
import { useRayClusterDashboardURL, useGatewayHostname } from '../useRayClusterDashboardURL';
import { HTTPRouteResource } from '../../k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sGetResource: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/hooks/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
  NotReadyError: jest.requireActual('@odh-dashboard/ui-core/hooks/useFetch').NotReadyError,
}));

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: jest.fn(),
}));

const useFetchMock = jest.mocked(useFetch);
const mockK8sGetResource = jest.mocked(k8sGetResource);
const mockUseDashboardNamespace = jest.mocked(reduxSelectors.useDashboardNamespace);

const mockGatewayResource = (hostname?: string, includeEmptyHostname = false) => ({
  spec: {
    listeners: hostname !== undefined || includeEmptyHostname ? [{ hostname: hostname ?? '' }] : [],
  },
});

const mockGatewayConfigResource = (domain?: string, useStatus = true) => ({
  ...(useStatus ? { status: { domain } } : { spec: { domain } }),
});

const mockHTTPRouteResource = (path?: string): HTTPRouteResource => ({
  apiVersion: 'gateway.networking.k8s.io/v1',
  kind: 'HTTPRoute',
  spec: {
    rules: path
      ? [
          {
            filters: [
              {
                requestRedirect: {
                  path: { replaceFullPath: path },
                },
              },
            ],
          },
        ]
      : [],
  },
});

const loadedFetch = (data: unknown) => ({
  data,
  loaded: true,
  error: undefined,
  refresh: jest.fn(),
});

const pendingFetch = () => ({
  data: null,
  loaded: false,
  error: undefined,
  refresh: jest.fn(),
});

describe('useGatewayHostname', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return hostname when Gateway is loaded', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? loadedFetch(mockGatewayResource('rh-ai.apps.example.com'))
        : pendingFetch();
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBe('rh-ai.apps.example.com');
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('should mark loaded when Gateway hostname is present without waiting for GatewayConfig', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return loadedFetch(mockGatewayResource('rh-ai.apps.example.com'));
      }
      return pendingFetch();
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBe('rh-ai.apps.example.com');
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should fall back to GatewayConfig status.domain when Gateway has no hostname', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? loadedFetch(mockGatewayResource())
        : loadedFetch(mockGatewayConfigResource('rh-ai.apps.example.com'));
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBe('rh-ai.apps.example.com');
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('should fall back to GatewayConfig spec.domain when status.domain is unset', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? loadedFetch(mockGatewayResource())
        : loadedFetch(mockGatewayConfigResource('rh-ai.apps.example.com', false));
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBe('rh-ai.apps.example.com');
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should prefer GatewayConfig status.domain over spec.domain when both are set', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? loadedFetch(mockGatewayResource())
        : loadedFetch({
            status: { domain: 'status.example.com' },
            spec: { domain: 'spec.example.com' },
          });
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBe('status.example.com');
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should report not loaded when Gateway has no hostname and GatewayConfig is still loading', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? loadedFetch(mockGatewayResource()) : pendingFetch();
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBeNull();
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should report not loaded when Gateway errors and GatewayConfig is still loading', () => {
    const gatewayError = new Error('Gateway fetch failed');
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? { data: null, loaded: true, error: gatewayError, refresh: jest.fn() }
        : pendingFetch();
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBeNull();
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBe(gatewayError);
  });

  it('should fall back to GatewayConfig when Gateway listener hostname is empty string', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? loadedFetch(mockGatewayResource('', true))
        : loadedFetch(mockGatewayConfigResource('rh-ai.apps.example.com'));
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBe('rh-ai.apps.example.com');
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should return null hostname when Gateway and GatewayConfig have no domain', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? loadedFetch(mockGatewayResource())
        : loadedFetch(mockGatewayConfigResource());
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBeNull();
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should return null hostname when data is null', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? loadedFetch(null) : loadedFetch(mockGatewayConfigResource());
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBeNull();
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should propagate fetch error when no hostname could be resolved', () => {
    const mockError = new Error('Gateway not found');
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? { data: null, loaded: false, error: mockError, refresh: jest.fn() }
        : loadedFetch(mockGatewayConfigResource());
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBeNull();
    expect(renderResult.result.current.error).toBe(mockError);
  });

  it('should prefer Gateway error over GatewayConfig error when both fail', () => {
    const gatewayError = new Error('Gateway fetch failed');
    const configError = new Error('GatewayConfig fetch failed');
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? { data: null, loaded: true, error: gatewayError, refresh: jest.fn() }
        : { data: null, loaded: true, error: configError, refresh: jest.fn() };
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.error).toBe(gatewayError);
    expect(renderResult.result.current.hostname).toBeNull();
  });

  it('should suppress errors when GatewayConfig provides a fallback domain', () => {
    const gatewayError = new Error('Gateway fetch failed');
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? { data: null, loaded: true, error: gatewayError, refresh: jest.fn() }
        : loadedFetch(mockGatewayConfigResource('rh-ai.apps.example.com'));
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBe('rh-ai.apps.example.com');
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult.result.current.loaded).toBe(true);
  });
});

describe('useRayClusterDashboardURL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'opendatahub' });
    mockK8sGetResource.mockReset();
  });

  it('should return full URL when both Gateway and HTTPRoute resolve', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return loadedFetch(mockGatewayResource('rh-ai.apps.example.com'));
      }
      if (callCount === 2) {
        return pendingFetch();
      }
      return loadedFetch(mockHTTPRouteResource('/ray/my-ns/my-cluster/#/'));
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.url).toBe(
      'https://rh-ai.apps.example.com/ray/my-ns/my-cluster/#/',
    );
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('should return full URL using GatewayConfig status.domain on OcpRoute clusters', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return loadedFetch(mockGatewayResource());
      }
      if (callCount === 2) {
        return loadedFetch(mockGatewayConfigResource('rh-ai.apps.example.com'));
      }
      return loadedFetch(mockHTTPRouteResource('/ray/my-ns/my-cluster/#/'));
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.url).toBe(
      'https://rh-ai.apps.example.com/ray/my-ns/my-cluster/#/',
    );
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should return full URL using GatewayConfig spec.domain when status.domain is unset', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return loadedFetch(mockGatewayResource());
      }
      if (callCount === 2) {
        return loadedFetch(mockGatewayConfigResource('rh-ai.apps.example.com', false));
      }
      return loadedFetch(mockHTTPRouteResource('/ray/my-ns/my-cluster/#/'));
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.url).toBe(
      'https://rh-ai.apps.example.com/ray/my-ns/my-cluster/#/',
    );
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should report not loaded when Gateway has no hostname and GatewayConfig is still loading', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return loadedFetch(mockGatewayResource());
      }
      if (callCount === 2) {
        return pendingFetch();
      }
      return loadedFetch(mockHTTPRouteResource('/ray/my-ns/my-cluster/#/'));
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.url).toBeNull();
  });

  it('should return null URL when rayClusterName is undefined', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useRayClusterDashboardURL)(undefined, 'my-ns');

    expect(renderResult.result.current.url).toBeNull();
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should return null URL when neither Gateway nor GatewayConfig provides a domain', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return loadedFetch(mockGatewayResource());
      }
      if (callCount === 2) {
        return loadedFetch(mockGatewayConfigResource());
      }
      return loadedFetch(mockHTTPRouteResource('/ray/my-ns/my-cluster/#/'));
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.url).toBeNull();
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should return null URL when HTTPRoute has no path', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return loadedFetch(mockGatewayResource('rh-ai.apps.example.com'));
      }
      if (callCount === 2) {
        return pendingFetch();
      }
      return loadedFetch(mockHTTPRouteResource());
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.url).toBeNull();
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should report not loaded when Gateway is still loading', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return pendingFetch();
      }
      return loadedFetch(mockHTTPRouteResource('/ray/my-ns/my-cluster/#/'));
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.url).toBeNull();
  });

  it('should report not loaded when HTTPRoute is still loading', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return loadedFetch(mockGatewayResource('rh-ai.apps.example.com'));
      }
      if (callCount === 2) {
        return pendingFetch();
      }
      return pendingFetch();
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.url).toBeNull();
  });

  it('should propagate Gateway error when GatewayConfig provides no domain', () => {
    const gatewayError = new Error('Gateway fetch failed');
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { data: null, loaded: true, error: gatewayError, refresh: jest.fn() };
      }
      if (callCount === 2) {
        return loadedFetch(mockGatewayConfigResource());
      }
      return loadedFetch(null);
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.error).toBe(gatewayError);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.url).toBeNull();
  });

  it('should propagate HTTPRoute error and report loaded', () => {
    const routeError = new Error('HTTPRoute not found');
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return loadedFetch(mockGatewayResource('rh-ai.apps.example.com'));
      }
      if (callCount === 2) {
        return pendingFetch();
      }
      return { data: null, loaded: true, error: routeError, refresh: jest.fn() };
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.error).toBe(routeError);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.url).toBeNull();
  });

  it('should prefer Gateway hostname error over HTTPRoute error when both fail', () => {
    const gatewayError = new Error('Gateway fetch failed');
    const routeError = new Error('HTTPRoute fetch failed');
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { data: null, loaded: true, error: gatewayError, refresh: jest.fn() };
      }
      if (callCount === 2) {
        return loadedFetch(mockGatewayConfigResource());
      }
      return { data: null, loaded: true, error: routeError, refresh: jest.fn() };
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.error).toBe(gatewayError);
    expect(renderResult.result.current.url).toBeNull();
  });

  it('should resolve HTTPRoute from fallback namespace when dashboard namespace has no route', async () => {
    const notFoundError = Object.assign(new Error('not found'), {
      statusObject: { code: 404 },
    });
    mockK8sGetResource
      .mockRejectedValueOnce(notFoundError)
      .mockResolvedValueOnce(mockHTTPRouteResource('/ray/ray-jobs/existing-ray-cluster/#/'));

    let fetchCallback: (() => Promise<unknown>) | undefined;
    let callCount = 0;
    useFetchMock.mockImplementation((callback) => {
      callCount++;
      if (callCount <= 2) {
        return callCount === 1
          ? loadedFetch(mockGatewayResource())
          : loadedFetch(mockGatewayConfigResource('rh-ai.apps.example.com'));
      }

      fetchCallback = callback as () => Promise<unknown>;
      return pendingFetch();
    });

    testHook(useRayClusterDashboardURL)('existing-ray-cluster', 'ray-jobs');

    if (!fetchCallback) {
      throw new Error('Expected HTTPRoute fetch callback');
    }
    const route = await fetchCallback();

    expect(mockK8sGetResource).toHaveBeenCalledTimes(2);
    expect(route).toEqual(mockHTTPRouteResource('/ray/ray-jobs/existing-ray-cluster/#/'));
  });

  it('should return null when HTTPRoute is missing from all namespaces', async () => {
    const notFoundError = Object.assign(new Error('not found'), {
      statusObject: { code: 404 },
    });
    mockK8sGetResource.mockRejectedValue(notFoundError);

    let fetchCallback: (() => Promise<unknown>) | undefined;
    let callCount = 0;
    useFetchMock.mockImplementation((callback) => {
      callCount++;
      if (callCount <= 2) {
        return callCount === 1
          ? loadedFetch(mockGatewayResource('rh-ai.apps.example.com'))
          : pendingFetch();
      }

      fetchCallback = callback as () => Promise<unknown>;
      return pendingFetch();
    });

    testHook(useRayClusterDashboardURL)('missing-cluster', 'ray-jobs');

    if (!fetchCallback) {
      throw new Error('Expected HTTPRoute fetch callback');
    }
    const route = await fetchCallback();

    // Unique namespaces: opendatahub (dashboard) + redhat-ods-applications
    expect(mockK8sGetResource).toHaveBeenCalledTimes(2);
    expect(route).toBeNull();
  });
});
