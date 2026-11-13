const { CONTENT_SECURITY_POLICY } = require('@odh-dashboard/app-config/security-policy');
const { createDevCspMiddleware } = require('../cspPolicy');

const DEV_HEADER = 'Content-Security-Policy-Report-Only';
const DOCUMENT_REQUEST = { method: 'GET', headers: { accept: 'text/html,application/xhtml+xml' } };

const parse = (policy) =>
  Object.fromEntries(
    policy.split('; ').map((part) => {
      const [name, ...tokens] = part.split(' ');
      return [name, tokens.join(' ')];
    }),
  );

/** Runs the middleware and returns the headers it set. */
const serve = (req, port = 4010, proxiedContexts = []) => {
  const headers = {};
  createDevCspMiddleware(port, proxiedContexts)(
    req,
    { setHeader: (name, value) => (headers[name] = value) },
    () => undefined,
  );
  return headers;
};

const PROXY_CONTEXTS = ['/api', '/_mf', '/mlflow', '/model-registry'];

describe('createDevCspMiddleware', () => {
  it('serves the shared policy as Report-Only on documents', () => {
    const headers = serve(DOCUMENT_REQUEST);

    expect(Object.keys(headers)).toEqual([DEV_HEADER]);
    expect(headers[DEV_HEADER]).toBeTruthy();
  });

  it('keeps every shipped directive, in the shipped order', () => {
    expect(Object.keys(parse(serve(DOCUMENT_REQUEST)[DEV_HEADER]))).toEqual(
      Object.keys(parse(CONTENT_SECURITY_POLICY)),
    );
  });

  it('widens only the declared directives, and only by appending tokens', () => {
    const shipped = parse(CONTENT_SECURITY_POLICY);
    const dev = parse(serve(DOCUMENT_REQUEST)[DEV_HEADER]);

    Object.entries(shipped).forEach(([directive, value]) => {
      if (directive === 'script-src' || directive === 'connect-src' || directive === 'frame-src') {
        expect(dev[directive].startsWith(`${value} `)).toBe(true);
      } else {
        expect(dev[directive]).toBe(value);
      }
    });
  });

  it('allows eval source maps, the HMR socket and the local proxies for its port', () => {
    const dev = parse(serve(DOCUMENT_REQUEST, 9001)[DEV_HEADER]);

    expect(dev['script-src']).toContain("'unsafe-eval'");
    expect(dev['connect-src']).toContain('ws:');
    expect(dev['connect-src']).toContain('http://localhost:9001');
    expect(dev['frame-src']).toContain('http://localhost:9001');
  });

  it('falls back to the default dev port', () => {
    expect(serve(DOCUMENT_REQUEST, undefined)[DEV_HEADER]).toContain('http://localhost:4010');
  });

  it('leaves documents the dev server proxies to another server untouched', () => {
    [
      '/mlflow',
      '/mlflow/',
      '/mlflow/experiments?x=1',
      '/_mf/maas',
      '/model-registry/',
      '/api/some/html',
    ].forEach((url) => {
      expect(serve({ ...DOCUMENT_REQUEST, url }, 4010, PROXY_CONTEXTS)).toEqual({});
    });
  });

  it('treats a path that merely starts like a proxy as proxied, matching the proxy matcher', () => {
    // `http-proxy-middleware` forwards by prefix, so these requests reach another server and
    // must not carry the dashboard's header.
    ['/apifoo', '/mlflowish', '/api2/x'].forEach((url) => {
      expect(serve({ ...DOCUMENT_REQUEST, url }, 4010, PROXY_CONTEXTS)).toEqual({});
    });
  });

  it('keeps the policy on host documents outside every proxy prefix', () => {
    ['/', '/index.html', '/projects/1', '/ml'].forEach((url) => {
      expect(serve({ ...DOCUMENT_REQUEST, url }, 4010, PROXY_CONTEXTS)).toHaveProperty(DEV_HEADER);
    });
  });

  it('leaves non-document requests untouched', () => {
    expect(serve({ method: 'GET', headers: { accept: '*/*' } })).toEqual({});
    expect(serve({ method: 'POST', headers: { accept: 'text/html' } })).toEqual({});
    expect(serve({ method: 'GET', headers: {} })).toEqual({});
  });

  it('fails the dev-server start when the shared policy loses a widened directive', () => {
    jest.isolateModules(() => {
      jest.doMock('@odh-dashboard/app-config/security-policy', () => ({
        CONTENT_SECURITY_POLICY_DIRECTIVES: [['default-src', "'self'"]],
        serializeContentSecurityPolicy: (directives) =>
          directives.map(([name, value]) => `${name} ${value}`).join('; '),
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createDevCspMiddleware: fresh } = require('../cspPolicy');

      expect(() => fresh(4010)).toThrow(/missing from the served policy: script-src/);
    });

    jest.dontMock('@odh-dashboard/app-config/security-policy');
    jest.resetModules();
  });
});
