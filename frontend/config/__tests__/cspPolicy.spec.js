const {
  CONTENT_SECURITY_POLICY,
  CSP_NONCE_PLACEHOLDER,
} = require('@odh-dashboard/app-config/security-policy');
const { createDevCspMiddleware } = require('../cspPolicy');

const DEV_HEADER = 'Content-Security-Policy-Report-Only';
const DOCUMENT_REQUEST = { method: 'GET', headers: { accept: 'text/html,application/xhtml+xml' } };
const SHELL = `<html><head><script nonce="${CSP_NONCE_PLACEHOLDER}">x</script></head></html>`;

const parse = (policy) =>
  Object.fromEntries(
    policy.split('; ').map((part) => {
      const [name, ...tokens] = part.split(' ');
      return [name, tokens.join(' ')];
    }),
  );

const nonceOf = (policy) => /'nonce-([^']+)'/.exec(policy ?? '')?.[1];

/** Runs the middleware and returns the headers, the body and whether next() was called. */
const serve = (req, { port = 4010, proxiedContexts = [], html = SHELL } = {}) => {
  const headers = {};
  let body;
  let nextCalled = false;
  createDevCspMiddleware(port, proxiedContexts, () => html)(
    req,
    {
      setHeader: (name, value) => {
        headers[name] = value;
      },
      end: (chunk) => {
        if (chunk !== undefined) {
          body = chunk;
        }
      },
    },
    () => {
      nextCalled = true;
    },
  );
  return { headers, body, nextCalled };
};

const PROXY_CONTEXTS = ['/api', '/_mf', '/mlflow', '/model-registry'];

describe('createDevCspMiddleware', () => {
  it('serves the shared policy as Report-Only on documents, with a nonce', () => {
    const { headers, body } = serve(DOCUMENT_REQUEST);
    const policy = headers[DEV_HEADER];

    expect(Object.keys(headers)).toEqual(
      expect.arrayContaining([DEV_HEADER, 'Content-Type', 'Content-Length']),
    );
    const nonce = nonceOf(policy);
    expect(nonce).toBeTruthy();
    // The nonce in the header is the one written into the document.
    expect(body).toContain(`nonce="${nonce}"`);
    expect(body).not.toContain(CSP_NONCE_PLACEHOLDER);
  });

  it('gives each document a different nonce', () => {
    expect(nonceOf(serve(DOCUMENT_REQUEST).headers[DEV_HEADER])).not.toBe(
      nonceOf(serve(DOCUMENT_REQUEST).headers[DEV_HEADER]),
    );
  });

  it('keeps every shipped directive, in the shipped order', () => {
    expect(Object.keys(parse(serve(DOCUMENT_REQUEST).headers[DEV_HEADER]))).toEqual(
      Object.keys(parse(CONTENT_SECURITY_POLICY)),
    );
  });

  it('widens only the declared directives, and only by appending tokens', () => {
    const shipped = parse(CONTENT_SECURITY_POLICY);
    const dev = parse(serve(DOCUMENT_REQUEST).headers[DEV_HEADER]);

    Object.entries(shipped).forEach(([directive, value]) => {
      if (directive === 'script-src' || directive === 'connect-src' || directive === 'frame-src') {
        expect(dev[directive].startsWith(`${value} `)).toBe(true);
      } else {
        expect(dev[directive]).toBe(value);
      }
    });
  });

  it('allows eval source maps, the HMR socket and the local proxies for its port', () => {
    const dev = parse(serve(DOCUMENT_REQUEST, { port: 9001 }).headers[DEV_HEADER]);

    expect(dev['script-src']).toContain("'unsafe-eval'");
    expect(dev['script-src']).toContain("'nonce-");
    expect(dev['connect-src']).toContain('ws:');
    expect(dev['connect-src']).toContain('http://localhost:9001');
    expect(dev['frame-src']).toContain('http://localhost:9001');
  });

  it('falls back to the default dev port', () => {
    const { headers } = serve(DOCUMENT_REQUEST, { port: undefined });
    expect(headers[DEV_HEADER]).toContain('http://localhost:4010');
  });

  it('accepts HEAD requests without a body', () => {
    const { headers, body } = serve({ ...DOCUMENT_REQUEST, method: 'HEAD' });
    expect(nonceOf(headers[DEV_HEADER])).toBeTruthy();
    expect(Number(headers['Content-Length'])).toBeGreaterThan(0);
    expect(body).toBeUndefined();
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
      expect(serve({ ...DOCUMENT_REQUEST, url }, { proxiedContexts: PROXY_CONTEXTS })).toEqual({
        headers: {},
        body: undefined,
        nextCalled: true,
      });
    });
  });

  it('treats a path that merely starts like a proxy as proxied, matching the proxy matcher', () => {
    // `http-proxy-middleware` forwards by prefix, so these requests reach another server and
    // must not carry the dashboard's header.
    ['/apifoo', '/mlflowish', '/api2/x'].forEach((url) => {
      expect(
        serve({ ...DOCUMENT_REQUEST, url }, { proxiedContexts: PROXY_CONTEXTS }).nextCalled,
      ).toBe(true);
    });
  });

  it('serves host documents outside every proxy prefix', () => {
    ['/', '/index.html', '/projects/1', '/ml'].forEach((url) => {
      const { headers, nextCalled } = serve(
        { ...DOCUMENT_REQUEST, url },
        { proxiedContexts: PROXY_CONTEXTS },
      );
      expect(nextCalled).toBe(false);
      expect(headers).toHaveProperty(DEV_HEADER);
    });
  });

  it('leaves non-document requests untouched', () => {
    expect(serve({ method: 'GET', headers: { accept: '*/*' } }).nextCalled).toBe(true);
    expect(serve({ method: 'POST', headers: { accept: 'text/html' } }).nextCalled).toBe(true);
    expect(serve({ method: 'GET', headers: {} }).nextCalled).toBe(true);
  });

  it('falls through before the first successful compile', () => {
    // A document without a policy is safe; one whose nonce does not match its header is not.
    expect(serve(DOCUMENT_REQUEST, { html: null }).nextCalled).toBe(true);
  });

  it('fails the dev-server start when the shared policy loses a widened directive', () => {
    jest.isolateModules(() => {
      jest.doMock('@odh-dashboard/app-config/security-policy', () => ({
        CONTENT_SECURITY_POLICY_DIRECTIVES: [['default-src', "'self'"]],
        CSP_NONCE_PLACEHOLDER: '__CSP_NONCE__',
        serializeContentSecurityPolicy: (directives, nonce) =>
          directives
            .map(([name, value]) =>
              name === 'script-src' && nonce
                ? `${name} ${value} 'nonce-${nonce}'`
                : `${name} ${value}`,
            )
            .join('; '),
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createDevCspMiddleware: fresh } = require('../cspPolicy');

      expect(() => fresh(4010)).toThrow(/missing from the served policy: script-src/);
    });

    jest.dontMock('@odh-dashboard/app-config/security-policy');
    jest.resetModules();
  });
});
