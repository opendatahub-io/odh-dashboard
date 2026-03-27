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

describe('useGatewayHostname', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return hostname when Gateway is loaded', () => {
    useFetchMock.mockReturnValue({
      data: mockGatewayResource('rh-ai.apps.example.com'),
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBe('rh-ai.apps.example.com');
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('should return null hostname when Gateway has no listeners', () => {
    useFetchMock.mockReturnValue({
      data: mockGatewayResource(),
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useGatewayHostname)();

    expect(renderResult.result.current.hostname).toBeNull();
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should return null hostname when data is null', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
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
        // useGatewayHostname call
        return {
          data: mockGatewayResource('rh-ai.apps.example.com'),
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        };
      }
      // useRayClusterDashboardURL HTTPRoute call
      return {
        data: mockHTTPRouteResource('/ray/my-ns/my-cluster/#/'),
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      };
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.url).toBe(
      'https://rh-ai.apps.example.com/ray/my-ns/my-cluster/#/',
    );
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
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

  it('should return null URL when Gateway has no hostname', () => {
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          data: mockGatewayResource(),
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        };
      }
      return {
        data: mockHTTPRouteResource('/ray/my-ns/my-cluster/#/'),
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      };
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
        return {
          data: mockGatewayResource('rh-ai.apps.example.com'),
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        };
      }
      return {
        data: mockHTTPRouteResource(),
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      };
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
      return {
        data: mockHTTPRouteResource('/ray/my-ns/my-cluster/#/'),
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      };
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
        return {
          data: mockGatewayResource('rh-ai.apps.example.com'),
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        };
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

  it('should propagate Gateway error and report loaded', () => {
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
      return {
        data: null,
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      };
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
        return {
          data: mockGatewayResource('rh-ai.apps.example.com'),
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        };
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

  it('should prefer Gateway error when both have errors', () => {
    const gatewayError = new Error('Gateway error');
    const routeError = new Error('Route error');
    let callCount = 0;
    useFetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          data: null,
          loaded: true,
          error: gatewayError,
          refresh: jest.fn(),
        };
      }
      return {
        data: null,
        loaded: true,
        error: routeError,
        refresh: jest.fn(),
      };
    });

    const renderResult = testHook(useRayClusterDashboardURL)('my-cluster', 'my-ns');

    expect(renderResult.result.current.error).toBe(gatewayError);
  });
});
