import * as fs from 'fs';
import * as path from 'path';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  CONTENT_SECURITY_POLICY,
  CONTENT_SECURITY_POLICY_DIRECTIVES,
  SEGMENT_TELEMETRY_ORIGIN,
} from '@odh-dashboard/app-config/security-policy';
import { CACHE_HEADER_IMMUTABLE, CACHE_HEADER_NO_CACHE } from '../cacheHeaders';
import {
  CACHE_CONTROL_NO_STORE,
  CSP_HEADER_ENFORCE,
  CSP_HEADER_REPORT_ONLY,
  CSP_MODE_ENV_VAR,
  CROSS_ORIGIN_OPENER_POLICY,
  REFERRER_POLICY,
  X_CONTENT_TYPE_OPTIONS,
  X_DNS_PREFETCH_CONTROL,
  X_FRAME_OPTIONS,
  applyContentSecurityPolicy,
  applySecurityHeaders,
  getCspMode,
  isImplicitCspReportOnly,
  isApiPath,
  isHtmlContentType,
  resolveCspHeaderName,
  resolveCspMode,
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

const parseCsp = (): Record<string, string[]> =>
  Object.fromEntries(
    CONTENT_SECURITY_POLICY.split('; ').map((part) => {
      const [directive, ...values] = part.split(' ');
      return [directive, values];
    }),
  );

describe('isHtmlContentType', () => {
  it.each(['text/html', 'text/html; charset=utf-8', 'TEXT/HTML'])(
    'treats %s as HTML',
    (contentType) => {
      expect(isHtmlContentType(contentType)).toBe(true);
    },
  );

  it.each([
    undefined,
    '',
    'text/plain',
    'application/json; charset=utf-8',
    'application/javascript',
    'image/png',
    'text/htmlx',
  ])('does not treat %s as HTML', (contentType) => {
    expect(isHtmlContentType(contentType)).toBe(false);
  });
});

describe('Content-Security-Policy', () => {
  it('sets the enforcing policy on HTML documents', () => {
    process.env[CSP_MODE_ENV_VAR] = 'enforce';
    try {
      const { reply, headers } = mockReply({ 'content-type': 'text/html; charset=utf-8' });
      applyContentSecurityPolicy(reply);
      expect(headers['content-security-policy']).toBe(CONTENT_SECURITY_POLICY);
      expect(headers['content-security-policy-report-only']).toBeUndefined();
    } finally {
      delete process.env[CSP_MODE_ENV_VAR];
    }
  });

  it('sends the Report-Only header by default, with the same directive string', () => {
    delete process.env[CSP_MODE_ENV_VAR];
    const { reply, headers } = mockReply({ 'content-type': 'text/html; charset=utf-8' });
    applyContentSecurityPolicy(reply);
    expect(headers['content-security-policy-report-only']).toBe(CONTENT_SECURITY_POLICY);
    expect(headers['content-security-policy']).toBeUndefined();
  });

  it('sends the Report-Only header in report-only mode, with the same directive string', () => {
    const { reply, headers } = mockReply({ 'content-type': 'text/html; charset=utf-8' });
    applyContentSecurityPolicy(reply, 'report-only');
    expect(headers['content-security-policy-report-only']).toBe(CONTENT_SECURITY_POLICY);
    expect(headers['content-security-policy']).toBeUndefined();
  });

  it('never sends both header names in one response', () => {
    for (const mode of ['enforce', 'report-only'] as const) {
      const { reply, headers } = mockReply({ 'content-type': 'text/html; charset=utf-8' });
      applyContentSecurityPolicy(reply, mode);
      const names = Object.keys(headers).filter((name) =>
        name.startsWith('content-security-policy'),
      );
      expect(names).toEqual([resolveCspHeaderName(mode).toLowerCase()]);
    }
  });

  it('does not send a CSP header on non-documents in report-only mode', () => {
    const { reply, headers } = mockReply({ 'content-type': 'application/json' });
    applyContentSecurityPolicy(reply, 'report-only');
    expect(Object.keys(headers).filter((name) => name.includes('security-policy'))).toEqual([]);
  });

  it.each(['application/json', 'application/javascript', 'text/css', 'image/png'])(
    'omits the policy for %s',
    (contentType) => {
      const { reply, headers } = mockReply({ 'content-type': contentType });
      applyContentSecurityPolicy(reply);
      expect(headers['content-security-policy']).toBeUndefined();
      expect(headers['content-security-policy-report-only']).toBeUndefined();
    },
  );

  it('is not applied app-wide: applySecurityHeaders leaves documents alone', () => {
    const { reply, headers } = mockReply({ 'content-type': 'text/html; charset=utf-8' });
    applySecurityHeaders(mockRequest('/projects'), reply);
    expect(headers['content-security-policy']).toBeUndefined();
    expect(headers['content-security-policy-report-only']).toBeUndefined();
  });

  it('allowlists the telemetry origin only where the Segment client needs it', () => {
    const csp = parseCsp();

    expect(csp['script-src']).toContain(SEGMENT_TELEMETRY_ORIGIN);
    expect(csp['connect-src']).toContain(SEGMENT_TELEMETRY_ORIGIN);

    for (const directive of [
      'default-src',
      'base-uri',
      'object-src',
      'style-src',
      'img-src',
      'font-src',
      'media-src',
      'frame-src',
      'frame-ancestors',
    ]) {
      expect(csp[directive]).not.toContain(SEGMENT_TELEMETRY_ORIGIN);
    }
  });

  it('keeps the document locked down and the preview surfaces usable', () => {
    const csp = parseCsp();

    expect(csp['default-src']).toEqual(["'self'"]);
    expect(csp['base-uri']).toEqual(["'self'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['form-action']).toEqual(["'self'"]);
    expect(csp['worker-src']).toEqual(expect.arrayContaining(["'self'", 'blob:']));
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['frame-src']).toContain('https:');
    expect(csp['img-src']).toEqual(expect.arrayContaining(['https:', 'data:', 'blob:']));
    expect(csp['media-src']).toEqual(expect.arrayContaining(['https:', 'data:', 'blob:']));
    expect(csp['style-src']).toContain("'unsafe-inline'");
  });

  it('never allows plain http:', () => {
    const insecure = Object.values(parseCsp())
      .flat()
      .filter((value) => value === 'http:' || value.startsWith('http://'));
    expect(insecure).toEqual([]);
  });
});

describe('CSP_MODE', () => {
  const originalMode = process.env[CSP_MODE_ENV_VAR];

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env[CSP_MODE_ENV_VAR];
    } else {
      process.env[CSP_MODE_ENV_VAR] = originalMode;
    }
  });

  it.each(['report-only', 'REPORT-ONLY', ' report-only '])('treats %p as report-only', (value) => {
    expect(resolveCspMode(value)).toBe('report-only');
  });

  it.each([undefined, ''])('defaults to report-only for %p', (value) => {
    expect(resolveCspMode(value)).toBe('report-only');
  });

  it.each(['enforce', 'ENFORCE', 'off', 'nonsense'])(
    'fails closed to enforcement for %p',
    (value) => {
      expect(resolveCspMode(value)).toBe('enforce');
    },
  );

  it('reads CSP_MODE from the environment', () => {
    process.env[CSP_MODE_ENV_VAR] = 'report-only';
    expect(getCspMode()).toBe('report-only');
    process.env[CSP_MODE_ENV_VAR] = '';
    expect(getCspMode()).toBe('report-only');
  });

  it.each([undefined, '', '   '])('reports %p as an implicit report-only fallback', (value) => {
    expect(isImplicitCspReportOnly(value)).toBe(true);
  });

  it.each(['report-only', 'enforce', 'off'])(
    'does not treat the explicit value %p as an implicit fallback',
    (value) => {
      expect(isImplicitCspReportOnly(value)).toBe(false);
    },
  );

  it('maps modes to header names', () => {
    expect(resolveCspHeaderName('enforce')).toBe(CSP_HEADER_ENFORCE);
    expect(resolveCspHeaderName('report-only')).toBe(CSP_HEADER_REPORT_ONLY);
  });

  it('sends the mode-selected header when the SPA route renders a document', () => {
    process.env[CSP_MODE_ENV_VAR] = 'report-only';
    const { reply, headers } = mockReply({ 'content-type': 'text/html' });
    applyContentSecurityPolicy(reply);
    expect(headers[CSP_HEADER_REPORT_ONLY.toLowerCase()]).toBe(CONTENT_SECURITY_POLICY);
    expect(headers[CSP_HEADER_ENFORCE.toLowerCase()]).toBeUndefined();
  });
});

describe('CSP parity across the Node backend, the dev server and core-bff', () => {
  const repoRoot = path.resolve(__dirname, '../../../..');

  it('serves the shared policy as Report-Only, widening only the declared directives', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createDevCspMiddleware } = require(path.join(repoRoot, 'frontend/config/cspPolicy.js'));

    const served: Record<string, string> = {};
    createDevCspMiddleware(4010)(
      { method: 'GET', headers: { accept: 'text/html' } },
      { setHeader: (name: string, value: string) => (served[name] = value) },
      () => undefined,
    );

    const dev = new Map(
      (served['Content-Security-Policy-Report-Only'] ?? '').split('; ').map((part) => {
        const [name, ...tokens] = part.split(' ');
        return [name, tokens.join(' ')] as const;
      }),
    );

    expect([...dev.keys()]).toEqual(CONTENT_SECURITY_POLICY_DIRECTIVES.map(([name]) => name));
    CONTENT_SECURITY_POLICY_DIRECTIVES.filter(
      ([name]) => !['script-src', 'connect-src', 'frame-src'].includes(name),
    ).forEach(([name, value]) => expect(dev.get(name)).toBe(value));

    expect(dev.get('script-src')).toContain("'unsafe-eval'");
    expect(dev.get('connect-src')).toContain('ws:');
    expect(dev.get('connect-src')).toContain('http://localhost:4010');
    expect(dev.get('frame-src')).toContain('http://localhost:4010');
  });

  it('matches the Go core-bff constant', () => {
    const goSource = fs.readFileSync(
      path.join(repoRoot, 'distributions/core-bff/bff/internal/constants/headers.go'),
      'utf8',
    );

    expect(readGoStringConst(goSource, 'ContentSecurityPolicy')).toBe(CONTENT_SECURITY_POLICY);
  });

  it('matches the directive order of the Go constant', () => {
    const goSource = fs.readFileSync(
      path.join(repoRoot, 'distributions/core-bff/bff/internal/constants/headers.go'),
      'utf8',
    );
    const goValue = readGoStringConst(goSource, 'ContentSecurityPolicy');

    expect(goValue.split('; ').map((part) => part.split(' ')[0])).toEqual(
      CONTENT_SECURITY_POLICY_DIRECTIVES.map(([directive]) => directive),
    );
  });
});

/**
 * Reads a Go constant built from concatenated string literals and identifiers,
 * resolving identifiers against other constants in the same file. Used only for the
 * cross-language parity assertion.
 */
const readGoStringConst = (source: string, name: string, seen: string[] = []): string => {
  if (seen.includes(name)) {
    throw new Error(`Circular Go constant reference: ${name}`);
  }
  const declaration = new RegExp(`(?<![\\w])${name}\\s*=\\s*`).exec(source);
  if (!declaration) {
    throw new Error(`Go constant not found: ${name}`);
  }

  const rest = source.slice(declaration.index + declaration[0].length).split('\n');
  let expression = '';
  for (const line of rest) {
    // Strip trailing comments, but never a `//` that is inside a string literal
    // (e.g. the telemetry origin URL).
    const commentIndex = line.indexOf('//');
    const quotesBefore = line.slice(0, commentIndex).split('"').length - 1;
    const withoutComment =
      commentIndex >= 0 && quotesBefore % 2 === 0 ? line.slice(0, commentIndex) : line;
    expression += ` ${withoutComment}`;
    if (!withoutComment.trimEnd().endsWith('+')) {
      break;
    }
  }

  const tokens = expression.match(/"[^"]*"|[A-Za-z_]\w*/g) ?? [];
  return tokens
    .map((token) =>
      token.startsWith('"')
        ? token.slice(1, -1)
        : readGoStringConst(source, token, [...seen, name]),
    )
    .join('');
};

describe('resolveStaticProxyCacheControl', () => {
  it.each([
    '/_mf/genAi/api/v1/user?asset=.deadbeef.js',
    '/_mf/genAi/api/v1/user',
    '/_mf/genAi/healthcheck',
  ])('forces no-store for non-cacheable path %s', (url) => {
    expect(resolveStaticProxyCacheControl(url)).toBe(CACHE_CONTROL_NO_STORE);
  });

  it.each([
    ['/_mf/genAi/app.abcdef123456.js', 'no-cache, no-store, private, max-age=0, must-revalidate'],
    ['/_mf/genAi/remoteEntry.js', 'private, max-age=0'],
    ['/_mf/genAi/api/v1/user', 'no-cache, no-store, private, max-age=0, must-revalidate'],
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
