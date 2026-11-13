import {
  CSP_VIOLATION_EVENT,
  CSP_VIOLATION_SEGMENT_EVENT,
  CSP_VIOLATION_STORAGE_KEY,
  CSP_VIOLATION_THROTTLE_MS,
  INVALID_URL_MARKER,
  blockedHost,
  clearCspViolationThrottle,
  installCspViolationReporter,
  sanitizeUrl,
  subscribeToCspViolations,
} from '#~/concepts/csp/cspViolations';

type ViolationInit = {
  effectiveDirective: string;
  blockedURI: string;
  violatedDirective?: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
  sample?: string;
  referrer?: string;
  disposition?: string;
  originalPolicy?: string;
};

const makeViolation = (init: ViolationInit): SecurityPolicyViolationEvent => {
  const event = new Event('securitypolicyviolation');
  return Object.assign(event, {
    violatedDirective: init.effectiveDirective,
    disposition: 'enforce',
    sourceFile: '',
    lineNumber: 0,
    columnNumber: 0,
    sample: '',
    referrer: '',
    policy: '',
    ...init,
  }) as unknown as SecurityPolicyViolationEvent;
};

/**
 * Runs `dispatch` and returns the exceptions jsdom reported on the window `error` channel.
 * An exception thrown by a `securitypolicyviolation` listener is reported there instead of
 * propagating through `dispatchEvent`, so `expect(...).not.toThrow()` cannot observe it.
 */
const windowErrorsFrom = (dispatch: () => void): unknown[] => {
  const errors: unknown[] = [];
  const listener = (event: Event): void => {
    errors.push((event as ErrorEvent).error ?? event);
    event.preventDefault();
  };
  window.addEventListener('error', listener);
  try {
    dispatch();
  } finally {
    window.removeEventListener('error', listener);
  }
  return errors;
};

const memoryStorage = (): Pick<Storage, 'getItem' | 'setItem'> & {
  data: Record<string, string>;
} => {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
};

describe('sanitizeUrl', () => {
  it('drops credentials, query string and fragment', () => {
    expect(sanitizeUrl('https://user:pass@example.com:8443/a/b?token=1#frag')).toBe(
      'https://example.com:8443/a/b',
    );
  });

  it('resolves relative paths against the page origin', () => {
    expect(sanitizeUrl('/api/v1?x=1')).toBe(`${window.location.origin}/api/v1`);
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeUrl('')).toBe('');
  });

  it('replaces unparseable input with a marker instead of forwarding it', () => {
    // A malformed URL can still carry credentials; never forward it verbatim.
    expect(sanitizeUrl('https://user:pass@[::1', 'not a base')).toBe(INVALID_URL_MARKER);
  });
});

describe('blockedHost', () => {
  it.each([
    ['inline', 'inline'],
    ['eval', 'eval'],
    ['data:image/png;base64,AAAA', 'data'],
    ['blob:https://example.com/1234', 'blob'],
    ['https://user:pass@bucket.s3.amazonaws.com/key?x=1#y', 'bucket.s3.amazonaws.com'],
  ])('reports %s as %s', (blockedURI, expected) => {
    expect(blockedHost(blockedURI)).toBe(expected);
  });

  it('reports unknown for an empty blockedURI', () => {
    expect(blockedHost('')).toBe('unknown');
  });

  it('reports a marker for an unparseable blockedURI instead of raw input', () => {
    expect(blockedHost('https://user:pass@[::1', 'not a base')).toBe(INVALID_URL_MARKER);
  });
});

describe('installCspViolationReporter', () => {
  let track: jest.Mock;
  let cleanup: (() => void) | undefined;

  const install = (options: Parameters<typeof installCspViolationReporter>[0] = {}) => {
    cleanup = installCspViolationReporter({
      storage: memoryStorage(),
      ...options,
    });
    return cleanup;
  };

  beforeEach(() => {
    track = jest.fn();
    window.analytics = { track };
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    delete window.analytics;
    delete window.clusterID;
    delete process.env.APP_ENV;
    jest.restoreAllMocks();
  });

  it('warns on every violation', () => {
    install();
    document.dispatchEvent(
      makeViolation({ effectiveDirective: 'script-src', blockedURI: 'https://evil.example/x.js' }),
    );
    document.dispatchEvent(
      makeViolation({ effectiveDirective: 'script-src', blockedURI: 'https://evil.example/x.js' }),
    );

    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('sends one Segment event per unique violation with sanitized fields', () => {
    // The host adapter supplies the cluster id from the dashboard's own global.
    window.clusterID = 'cluster-1';
    install();

    document.dispatchEvent(
      makeViolation({
        effectiveDirective: 'script-src',
        blockedURI: 'https://user:pass@evil.example/x.js?token=abc#frag',
        sourceFile: 'https://odh.example/app.js?cache=1',
        lineNumber: 12,
        columnNumber: 4,
        sample: 'alert(1)',
        originalPolicy: "script-src 'self'",
      }),
    );
    // Same directive and host: throttled.
    document.dispatchEvent(
      makeViolation({
        effectiveDirective: 'script-src',
        blockedURI: 'https://evil.example/other.js',
      }),
    );

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(
      CSP_VIOLATION_SEGMENT_EVENT,
      {
        effectiveDirective: 'script-src',
        blockedHost: 'evil.example',
        disposition: 'enforce',
        pagePath: window.location.pathname,
        sourceFile: 'https://odh.example/app.js',
        lineNumber: 12,
        columnNumber: 4,
        sample: 'alert(1)',
        referrer: '',
        policy: "script-src 'self'",
        clusterID: 'cluster-1',
      },
      { app: { version: process.env.INTERNAL_DASHBOARD_VERSION ?? '' } },
    );
  });

  it('sanitizes malformed URLs in every reported field', () => {
    install();

    document.dispatchEvent(
      makeViolation({
        effectiveDirective: 'script-src',
        blockedURI: 'https://user:pass@[::1',
        sourceFile: 'https://user:pass@[::1',
        referrer: 'https://user:pass@[::1',
      }),
    );

    expect(track).toHaveBeenCalledTimes(1);
    const [eventName, properties] = track.mock.calls[0];
    expect(eventName).toBe(CSP_VIOLATION_SEGMENT_EVENT);
    expect(properties).toMatchObject({
      blockedHost: INVALID_URL_MARKER,
      sourceFile: INVALID_URL_MARKER,
      referrer: INVALID_URL_MARKER,
    });
    expect(JSON.stringify(properties)).not.toContain('user:pass');
  });

  it('leaves the throttle window closed while the Segment SDK is unavailable', () => {
    // The adapter drops events until the SDK initializes, so opening the window here would
    // suppress the next occurrence for 24 hours without ever reaching telemetry.
    delete window.analytics;
    const storage = memoryStorage();
    cleanup = installCspViolationReporter({ storage });

    document.dispatchEvent(
      makeViolation({ effectiveDirective: 'script-src', blockedURI: 'https://evil.example/a.js' }),
    );

    expect(track).not.toHaveBeenCalled();
    expect(storage.data[CSP_VIOLATION_STORAGE_KEY]).toBeUndefined();
  });

  it('forwards a violation raised before initialization on the next occurrence', () => {
    delete window.analytics;
    const storage = memoryStorage();
    cleanup = installCspViolationReporter({ storage });
    const violation = makeViolation({
      effectiveDirective: 'script-src',
      blockedURI: 'https://evil.example/a.js',
    });

    document.dispatchEvent(violation);
    window.analytics = { track };
    document.dispatchEvent(violation);

    expect(track).toHaveBeenCalledTimes(1);
    expect(storage.data[CSP_VIOLATION_STORAGE_KEY]).toContain('script-src|evil.example');
  });

  it('does not send or throttle in development mode', () => {
    process.env.APP_ENV = 'development';
    const storage = memoryStorage();
    cleanup = installCspViolationReporter({ storage });

    document.dispatchEvent(
      makeViolation({ effectiveDirective: 'script-src', blockedURI: 'https://evil.example/a.js' }),
    );

    expect(track).not.toHaveBeenCalled();
    expect(storage.data[CSP_VIOLATION_STORAGE_KEY]).toBeUndefined();
  });

  it('raises no listener exception in development without the Segment SDK', () => {
    process.env.APP_ENV = 'development';
    delete window.analytics;
    install();

    const errors = windowErrorsFrom(() =>
      document.dispatchEvent(
        makeViolation({
          effectiveDirective: 'script-src',
          blockedURI: 'https://evil.example/a.js',
        }),
      ),
    );

    expect(errors).toEqual([]);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('observes exceptions raised inside the violation listener', () => {
    // Proves the two assertions around it are meaningful: a throwing listener is visible.
    install();
    const boom = (): void => {
      throw new Error('listener boom');
    };
    document.addEventListener('securitypolicyviolation', boom);

    const errors = windowErrorsFrom(() =>
      document.dispatchEvent(
        makeViolation({
          effectiveDirective: 'script-src',
          blockedURI: 'https://evil.example/a.js',
        }),
      ),
    );
    document.removeEventListener('securitypolicyviolation', boom);

    expect(errors).toHaveLength(1);
  });

  it('does not throttle development reporting', () => {
    process.env.APP_ENV = 'development';
    const storage = memoryStorage();
    cleanup = installCspViolationReporter({ storage });

    document.dispatchEvent(
      makeViolation({ effectiveDirective: 'script-src', blockedURI: 'https://evil.example/a.js' }),
    );
    document.dispatchEvent(
      makeViolation({ effectiveDirective: 'script-src', blockedURI: 'https://evil.example/a.js' }),
    );

    expect(track).not.toHaveBeenCalled();
    expect(storage.data[CSP_VIOLATION_STORAGE_KEY]).toBeUndefined();
  });

  it('reports a report-only and an enforced event separately for the same directive and host', () => {
    const storage = memoryStorage();
    cleanup = installCspViolationReporter({ storage });

    document.dispatchEvent(
      makeViolation({
        effectiveDirective: 'script-src',
        blockedURI: 'https://evil.example/a.js',
        disposition: 'report',
      }),
    );
    // Switching CSP_MODE to enforce must still report the first actual block.
    document.dispatchEvent(
      makeViolation({
        effectiveDirective: 'script-src',
        blockedURI: 'https://evil.example/a.js',
        disposition: 'enforce',
      }),
    );

    expect(track).toHaveBeenCalledTimes(2);
    expect(Object.keys(JSON.parse(storage.data[CSP_VIOLATION_STORAGE_KEY]))).toEqual(
      expect.arrayContaining(['report|script-src|evil.example', 'enforce|script-src|evil.example']),
    );
  });

  it('reports a different directive or host separately', () => {
    install();

    document.dispatchEvent(
      makeViolation({ effectiveDirective: 'script-src', blockedURI: 'https://evil.example/a.js' }),
    );
    document.dispatchEvent(
      makeViolation({ effectiveDirective: 'img-src', blockedURI: 'https://evil.example/a.png' }),
    );

    expect(track).toHaveBeenCalledTimes(2);
  });

  it('throttles for 24 hours per unique violation', () => {
    const storage = memoryStorage();
    let now = 1_000;
    cleanup = installCspViolationReporter({ storage, now: () => now });
    const violation = makeViolation({
      effectiveDirective: 'script-src',
      blockedURI: 'https://evil.example/a.js',
    });

    document.dispatchEvent(violation);
    now += CSP_VIOLATION_THROTTLE_MS - 1;
    document.dispatchEvent(violation);
    expect(track).toHaveBeenCalledTimes(1);

    now += 2;
    document.dispatchEvent(violation);
    expect(track).toHaveBeenCalledTimes(2);
  });

  it('persists the throttle window across reporters (per browser)', () => {
    const storage = memoryStorage();
    const violation = makeViolation({
      effectiveDirective: 'script-src',
      blockedURI: 'https://evil.example/a.js',
    });

    const first = installCspViolationReporter({ storage });
    document.dispatchEvent(violation);
    first();

    const second = installCspViolationReporter({ storage });
    document.dispatchEvent(violation);
    second();

    expect(track).toHaveBeenCalledTimes(1);
    expect(storage.data[CSP_VIOLATION_STORAGE_KEY]).toContain('script-src|evil.example');
  });

  it('notifies subscribers once per unique violation per session', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToCspViolations(listener);
    try {
      install();
      const violation = makeViolation({
        effectiveDirective: 'script-src',
        blockedURI: 'https://evil.example/a.js',
      });
      document.dispatchEvent(violation);
      document.dispatchEvent(violation);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0]).toMatchObject({ blockedHost: 'evil.example' });
    } finally {
      unsubscribe();
    }
  });

  it('degrades to console-only capture when Segment is unavailable', () => {
    delete window.analytics;
    install();

    const errors = windowErrorsFrom(() =>
      document.dispatchEvent(
        makeViolation({ effectiveDirective: 'script-src', blockedURI: 'inline' }),
      ),
    );

    expect(errors).toEqual([]);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('dispatches a dev-only event once per unique violation', () => {
    const listener = jest.fn();
    window.addEventListener(CSP_VIOLATION_EVENT, listener);
    try {
      install({ devMode: true });
      const violation = makeViolation({
        effectiveDirective: 'script-src',
        blockedURI: 'https://evil.example/a.js',
      });
      document.dispatchEvent(violation);
      document.dispatchEvent(violation);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].detail).toMatchObject({
        effectiveDirective: 'script-src',
        blockedHost: 'evil.example',
      });
    } finally {
      window.removeEventListener(CSP_VIOLATION_EVENT, listener);
    }
  });

  it('does not dispatch the dev event in production mode', () => {
    const listener = jest.fn();
    window.addEventListener(CSP_VIOLATION_EVENT, listener);
    try {
      install({ devMode: false });
      document.dispatchEvent(
        makeViolation({
          effectiveDirective: 'script-src',
          blockedURI: 'https://evil.example/a.js',
        }),
      );
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(CSP_VIOLATION_EVENT, listener);
    }
  });

  it('clears the throttle window on request', () => {
    const storage = memoryStorage();
    storage.setItem(CSP_VIOLATION_STORAGE_KEY, JSON.stringify({ 'script-src|evil.example': 1 }));
    clearCspViolationThrottle(storage);
    expect(storage.data[CSP_VIOLATION_STORAGE_KEY]).toBe('{}');
  });
});
