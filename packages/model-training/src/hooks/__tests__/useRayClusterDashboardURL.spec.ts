import { testHook } from '@odh-dashboard/jest-config/hooks';
import useFetch from '@odh-dashboard/internal/utilities/useFetch';
import * as reduxSelectors from '@odh-dashboard/internal/redux/selectors/project';
import { useRayClusterDashboardURL, useGatewayHostname } from '../useRayClusterDashboardURL';

jest.mock('@odh-dashboard/internal/utilities/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
  NotReadyError: jest.requireActual('@odh-dashboard/internal/utilities/useFetch').NotReadyError,
}));

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: jest.fn(),
}));

const useFetchMock = jest.mocked(useFetch);
const mockUseDashboardNamespace = jest.mocked(reduxSelectors.useDashboardNamespace);

const mockGatewayResource = (hostname?: string) => ({
  spec: {
    listeners: hostname ? [{ hostname }] : [],
  },
});

const mockHTTPRouteResource = (path?: string) => ({
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

const mockGatewayConfigResource = (domain?: string, useStatus = true) => ({
  ...(useStatus ? { status: { domain } } : { spec: { domain } }),
});

const loadedFetch = (data: unknown) => ({
  data,
  loaded: true,
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
        : loadedFetch(mockGatewayConfigResource('fallback.example.com'));
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBe('rh-ai.apps.example.com');
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
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

  it('should propagate fetch error', () => {
    const mockError = new Error('Gateway not found');

    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: mockError,
      refresh: jest.fn(),
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
});

describe('useRayClusterDashboardURL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'opendatahub' });
  });

  it('should return full URL when both Gateway and HTTPRoute resolve', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return loadedFetch(mockGatewayResource('rh-ai.apps.example.com'));
      }
      if (callCount === 2) {
        return loadedFetch(mockGatewayConfigResource());
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
        return loadedFetch(mockGatewayConfigResource());
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
        return {
          data: null,
          loaded: false,
          error: undefined,
          refresh: jest.fn(),
        };
      }
      if (callCount === 2) {
        return loadedFetch(mockGatewayConfigResource('rh-ai.apps.example.com'));
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
        return loadedFetch(mockGatewayConfigResource());
      }
      return {
        data: null,
        loaded: false,
        error: undefined,
        refresh: jest.fn(),
      };
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
        return {
          data: null,
          loaded: false,
          error: gatewayError,
          refresh: jest.fn(),
        };
      }
      if (callCount === 2) {
        // GatewayConfig resolves but provides no domain — hostname remains null,
        // so the Gateway error surfaces to the caller.
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
        return loadedFetch(mockGatewayConfigResource());
      }
      return {
        data: null,
        loaded: false,
        error: routeError,
        refresh: jest.fn(),
      };
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
});
