import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  CACHE_CONTROL_NO_STORE,
  CROSS_ORIGIN_OPENER_POLICY,
  REFERRER_POLICY,
  X_CONTENT_TYPE_OPTIONS,
  X_DNS_PREFETCH_CONTROL,
  X_FRAME_OPTIONS,
  applySecurityHeaders,
  isApiPath,
  rewriteNoStoreCacheHeaders,
  setNoStoreCacheHeaders,
} from '../securityHeaders';

const mockReply = (existing: Record<string, string> = {}) => {
  const headers: Record<string, string> = Object.fromEntries(
    Object.entries(existing).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const reply = {
    getHeader: (name: string) => headers[name.toLowerCase()],
    header: (name: string, value: string) => {
      headers[name.toLowerCase()] = value;
      return reply;
    },
  };
  return { reply: reply as unknown as FastifyReply, headers };
};

const mockRequest = (url: string) => ({ url } as FastifyRequest);

describe('isApiPath', () => {
  it.each(['/api', '/api/health', '/api/status', '/wss', '/wss/k8s'])(
    'treats %s as API',
    (urlPath) => {
      expect(isApiPath(urlPath)).toBe(true);
    },
  );

  it.each([
    '/',
    '/projects',
    '/vendor.js',
    '/_mf/genAi/remoteEntry.js',
    '/index.html',
    // Module proxies set cache via rewrite helpers, not isApiPath.
    '/gen-ai/api/v1/models',
    '/_bff/mlflow/api',
    '/agent-ops/healthcheck',
  ])('treats %s as non-API', (urlPath) => {
    expect(isApiPath(urlPath)).toBe(false);
  });
});

describe('setNoStoreCacheHeaders', () => {
  it('sets Cache-Control on the reply', () => {
    const { reply, headers } = mockReply();
    setNoStoreCacheHeaders(reply);
    expect(headers['cache-control']).toBe(CACHE_CONTROL_NO_STORE);
  });
});

describe('applySecurityHeaders', () => {
  it('always sets common security headers', () => {
    const { reply, headers } = mockReply();
    applySecurityHeaders(mockRequest('/vendor.js'), reply);
    expect(headers['x-content-type-options']).toBe(X_CONTENT_TYPE_OPTIONS);
    expect(headers['cross-origin-opener-policy']).toBe(CROSS_ORIGIN_OPENER_POLICY);
    expect(headers['x-frame-options']).toBe(X_FRAME_OPTIONS);
    expect(headers['x-dns-prefetch-control']).toBe(X_DNS_PREFETCH_CONTROL);
    expect(headers['referrer-policy']).toBe(REFERRER_POLICY);
  });

  it('forces no-store on API paths', () => {
    const { reply, headers } = mockReply();
    applySecurityHeaders(mockRequest('/api/status?x=1'), reply);
    expect(headers['cache-control']).toBe(CACHE_CONTROL_NO_STORE);
  });

  it('does not set cache headers on non-API paths', () => {
    const { reply, headers } = mockReply();
    applySecurityHeaders(mockRequest('/projects'), reply);
    expect(headers['cache-control']).toBeUndefined();
  });
});

describe('rewriteNoStoreCacheHeaders', () => {
  it('forces no-store without mutating the input', () => {
    const input: Record<string, string> = {};
    const headers = rewriteNoStoreCacheHeaders(input);
    expect(headers['cache-control']).toBe(CACHE_CONTROL_NO_STORE);
    expect(input['cache-control']).toBeUndefined();
    expect(headers).not.toBe(input);
  });

  it('overwrites an existing upstream cache-control', () => {
    const headers = rewriteNoStoreCacheHeaders({
      'cache-control': 'public, max-age=31536000, immutable',
    });
    expect(headers['cache-control']).toBe(CACHE_CONTROL_NO_STORE);
  });
});
