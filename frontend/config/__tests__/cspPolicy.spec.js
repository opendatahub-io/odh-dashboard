const {
  DEFAULT_DEV_PORT,
  DEV_CSP_HEADER_NAME,
  applyDevDelta,
  createCspResolver,
  parsePolicy,
  serializePolicy,
} = require('../cspPolicy');

const SERVED_POLICY =
  "default-src 'self'; object-src 'none'; " +
  "script-src 'self' https://console.redhat.com; img-src 'self' https: data: blob:; " +
  "connect-src 'self' https://console.redhat.com; frame-src 'self' https:; " +
  "form-action 'self'; worker-src 'self' blob:; frame-ancestors 'none'";

const asMap = (directives) => Object.fromEntries(directives);

describe('parsePolicy / serializePolicy', () => {
  it('round-trips a served policy', () => {
    expect(serializePolicy(parsePolicy(SERVED_POLICY))).toBe(SERVED_POLICY);
  });

  it('normalizes whitespace around directives', () => {
    expect(parsePolicy("  default-src  'self' ;  script-src 'self' ")).toEqual([
      ['default-src', "'self'"],
      ['script-src', "'self'"],
    ]);
  });
});

describe('applyDevDelta', () => {
  it('widens only the declared directives', () => {
    const merged = asMap(applyDevDelta(parsePolicy(SERVED_POLICY), 4010));

    expect(merged['script-src']).toBe("'self' https://console.redhat.com 'unsafe-eval'");
    expect(merged['connect-src']).toBe(
      "'self' https://console.redhat.com ws: http://localhost:4010",
    );
    expect(merged['frame-src']).toBe("'self' https: http://localhost:4010");
    expect(merged['img-src']).toBe("'self' https: data: blob:");
    expect(merged['frame-ancestors']).toBe("'none'");
  });

  it('uses the default dev port when none is given', () => {
    expect(asMap(applyDevDelta(parsePolicy(SERVED_POLICY)))['connect-src']).toContain(
      `http://localhost:${DEFAULT_DEV_PORT}`,
    );
  });

  it('throws when the served policy lacks a directive the delta targets', () => {
    expect(() => applyDevDelta(parsePolicy("default-src 'self'"))).toThrow(
      /missing from the served policy: script-src/,
    );
  });
});

describe('createCspResolver', () => {
  const source = { url: 'http://backend.test/' };

  it('sends the fetched policy as Report-Only with the dev delta applied', async () => {
    const resolver = createCspResolver({
      source,
      port: 4010,
      fetchPolicy: jest.fn().mockResolvedValue({ 'content-security-policy': SERVED_POLICY }),
    });

    const csp = await resolver();

    expect(csp.name).toBe(DEV_CSP_HEADER_NAME);
    expect(csp.name).toBe('Content-Security-Policy-Report-Only');
    expect(csp.value).toContain("script-src 'self' https://console.redhat.com 'unsafe-eval'");
  });

  it('accepts a policy the backend already serves as Report-Only', async () => {
    const resolver = createCspResolver({
      source,
      port: 4010,
      fetchPolicy: jest
        .fn()
        .mockResolvedValue({ 'content-security-policy-report-only': SERVED_POLICY }),
    });

    const csp = await resolver();

    expect(csp.name).toBe(DEV_CSP_HEADER_NAME);
    expect(csp.value).toContain("connect-src 'self' https://console.redhat.com ws:");
  });

  it('serves no policy and warns when the response has no CSP header', async () => {
    const log = { warn: jest.fn() };
    const resolver = createCspResolver({
      source,
      fetchPolicy: jest.fn().mockResolvedValue({}),
      log,
    });

    expect(await resolver()).toBeNull();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('no Content-Security-Policy'));
  });

  it('reuses the last fetched policy when a later fetch fails', async () => {
    const log = { warn: jest.fn() };
    const fetchPolicy = jest
      .fn()
      .mockResolvedValueOnce({ 'content-security-policy': SERVED_POLICY })
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const resolver = createCspResolver({ source, port: 4010, fetchPolicy, log });

    const first = await resolver();
    const second = await resolver();

    expect(second).toEqual(first);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('reusing the last fetched policy'),
    );
  });

  it('rate-limits repeated fetch warnings', async () => {
    const log = { warn: jest.fn() };
    const resolver = createCspResolver({
      source,
      fetchPolicy: jest.fn().mockRejectedValue(new Error('offline')),
      log,
    });

    await resolver();
    await resolver();

    expect(log.warn).toHaveBeenCalledTimes(1);
  });
});
