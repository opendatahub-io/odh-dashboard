import type { FastifyReply, FastifyRequest } from 'fastify';
import { CACHE_HEADER_IMMUTABLE, CACHE_HEADER_NO_CACHE } from '../cacheHeaders';
import {
  CACHE_CONTROL_NO_STORE,
  CROSS_ORIGIN_OPENER_POLICY,
  REFERRER_POLICY,
  X_CONTENT_TYPE_OPTIONS,
  X_DNS_PREFETCH_CONTROL,
  X_FRAME_OPTIONS,
  applySecurityHeaders,
  isApiPath,
  resolveStaticProxyCacheControl,
  rewriteNoStoreCacheHeaders,
  rewriteStaticProxyCacheHeaders,
  setNoStoreCacheHeaders,
  staticProxyCacheOnResponse,
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

describe('resolveStaticProxyCacheControl', () => {
  it.each([
    '/_mf/genAi/api/v1/user?asset=.deadbeef.js',
    '/_mf/genAi/api/v1/user',
    '/_mf/genAi/healthcheck',
  ])('forces no-store for non-cacheable path %s', (url) => {
    expect(resolveStaticProxyCacheControl(url)).toBe(CACHE_CONTROL_NO_STORE);
  });

  it.each([
    ['/_mf/genAi/app.abcdef123456.js', 'no-cache, no-store, must-revalidate'],
    ['/_mf/genAi/remoteEntry.js', 'private, max-age=0'],
    ['/_mf/genAi/api/v1/user', 'no-cache, no-store, must-revalidate'],
  ])('preserves upstream restrictive Cache-Control for %s', (url, upstream) => {
    expect(resolveStaticProxyCacheControl(url, upstream)).toBe(upstream);
  });

  it.each(['/_mf/genAi/api/v1/user', '/_mf/genAi/healthcheck'])(
    'forces no-store for %s when upstream is private',
    (url) => {
      expect(resolveStaticProxyCacheControl(url, 'private, max-age=3600')).toBe(
        CACHE_CONTROL_NO_STORE,
      );
    },
  );

  it.each([
    ['/_mf/genAi/app.abcdef123456.js?v=1', CACHE_HEADER_IMMUTABLE],
    ['/_mf/genAi/remoteEntry.js', CACHE_HEADER_NO_CACHE],
  ])('applies filename-based policy for %s (pathname only)', (url, expected) => {
    expect(resolveStaticProxyCacheControl(url, undefined, 200)).toBe(expected);
  });

  it.each([301, 302, 307, 404, 503])(
    'forces no-store for non-success status %s even for hashed assets',
    (statusCode) => {
      expect(
        resolveStaticProxyCacheControl('/_mf/genAi/app.abcdef123456.js', undefined, statusCode),
      ).toBe(CACHE_CONTROL_NO_STORE);
    },
  );

  it.each([
    ['/_mf/genAi/remoteEntry.js', CACHE_HEADER_NO_CACHE],
    ['/_mf/genAi/app.abcdef123456.js', CACHE_HEADER_IMMUTABLE],
  ])('keeps the filename cache policy for 304 on %s', (url, expected) => {
    expect(resolveStaticProxyCacheControl(url, undefined, 304)).toBe(expected);
  });
});

describe('staticProxyCacheOnResponse', () => {
  const run = (statusCode: number, cacheControl: string) => {
    const { reply, headers } = mockReply({ 'cache-control': cacheControl });
    const send = jest.fn();
    Object.assign(reply, { send });
    const stream = {};
    staticProxyCacheOnResponse(mockRequest('/_mf/genAi/remoteEntry.js'), reply, {
      statusCode,
      stream,
    } as never);
    return { headers, send, stream };
  };

  it.each([200, 304])(
    'should leave the rewriteHeaders Cache-Control in place on %s',
    (statusCode) => {
      const { headers, send, stream } = run(statusCode, CACHE_HEADER_NO_CACHE);
      expect(headers['cache-control']).toBe(CACHE_HEADER_NO_CACHE);
      expect(send).toHaveBeenCalledWith(stream);
    },
  );

  it.each([302, 307, 404, 503])('should force no-store on non-success status %s', (statusCode) => {
    const { headers, send, stream } = run(statusCode, CACHE_HEADER_IMMUTABLE);
    expect(headers['cache-control']).toBe(CACHE_CONTROL_NO_STORE);
    expect(send).toHaveBeenCalledWith(stream);
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

describe('rewriteStaticProxyCacheHeaders', () => {
  it('classifies pathname and does not mutate input headers', () => {
    const input: Record<string, string> = {};
    const headers = rewriteStaticProxyCacheHeaders(input, mockRequest('/_mf/genAi/remoteEntry.js'));
    expect(headers['cache-control']).toBe(CACHE_HEADER_NO_CACHE);
    expect(input['cache-control']).toBeUndefined();
  });

  it('does not promote API URLs via query-string hash bait', () => {
    const headers = rewriteStaticProxyCacheHeaders(
      {},
      mockRequest('/_mf/genAi/api/v1/user?asset=.deadbeef.js'),
    );
    expect(headers['cache-control']).toBe(CACHE_CONTROL_NO_STORE);
  });
});
