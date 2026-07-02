import httpProxy from '@fastify/http-proxy';

// Mock @fastify/http-proxy to capture registration options
jest.mock('@fastify/http-proxy', () => jest.fn());

// Mock constants
jest.mock('../../utils/constants', () => ({
  DEV_MODE: false,
  PORT: 8080,
  IP: '0.0.0.0',
  LOG_LEVEL: 'info',
  APP_ENV: 'production',
}));

describe('registerProxy httpRequestTimeout', () => {
  let registerProxy: typeof import('../../utils/proxy').registerProxy;
  let mockFastify: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFastify = {
      register: jest.fn(),
      log: { info: jest.fn() },
    };
    // Re-import after mocks are set up
    registerProxy = require('../../utils/proxy').registerProxy;
  });

  it('should pass http.requestOptions.timeout when httpRequestTimeout is provided', async () => {
    await registerProxy(mockFastify, {
      prefix: '/gen-ai/api',
      rewritePrefix: '/api',
      service: { name: 'odh-dashboard', namespace: 'test-ns', port: 8143 },
      tls: true,
      httpRequestTimeout: 300000,
    });

    expect(mockFastify.register).toHaveBeenCalledWith(
      httpProxy,
      expect.objectContaining({
        http: {
          requestOptions: { timeout: 300000 },
        },
      }),
    );
  });

  it('should NOT pass http options when httpRequestTimeout is undefined', async () => {
    await registerProxy(mockFastify, {
      prefix: '/maas/api',
      rewritePrefix: '/api',
      service: { name: 'odh-dashboard', namespace: 'test-ns', port: 8243 },
      tls: true,
    });

    const registeredOptions = mockFastify.register.mock.calls[0][1];
    expect(registeredOptions.http).toBeUndefined();
  });

  it('should construct correct upstream URL for cluster mode', async () => {
    await registerProxy(mockFastify, {
      prefix: '/gen-ai/api',
      service: { name: 'my-service', namespace: 'my-ns', port: 8143 },
      tls: true,
      httpRequestTimeout: 300000,
    });

    const registeredOptions = mockFastify.register.mock.calls[0][1];
    expect(registeredOptions.upstream).toBe('https://my-service.my-ns.svc.cluster.local:8143');
  });

  it('should apply timeout of 5 minutes when genAi timeout is specified', async () => {
    await registerProxy(mockFastify, {
      prefix: '/gen-ai/api',
      rewritePrefix: '/api',
      service: { name: 'odh-dashboard', namespace: 'test-ns', port: 8143 },
      tls: true,
      httpRequestTimeout: 5 * 60 * 1000,
    });

    const registeredOptions = mockFastify.register.mock.calls[0][1];
    expect(registeredOptions.http.requestOptions.timeout).toBe(300000);
  });
});
