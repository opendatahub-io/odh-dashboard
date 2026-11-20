import { describe, expect, it, jest } from '@jest/globals';
import { type DocumentWindow, readDocumentPolicy } from '../readDocumentPolicy';

const DASHBOARD_HTML = '<!doctype html><html><body><div id="root"></div></body></html>';

const response = (
  html: string,
  { contentType = 'text/html; charset=utf-8', headers = {} } = {} as {
    contentType?: string;
    headers?: Record<string, string>;
  },
): Response =>
  ({
    headers: {
      get: (name: string) =>
        name === 'content-type' ? contentType : headers[name.toLowerCase()] ?? null,
    },
    text: async () => html,
  } as unknown as Response);

const windowWith = (fetchImpl: unknown, href = 'https://dashboard.example/'): DocumentWindow =>
  ({
    location: { href },
    fetch: fetchImpl,
  } as unknown as DocumentWindow);

describe('readDocumentPolicy', () => {
  it('reports the policy of the dashboard shell', async () => {
    const fetchMock = jest.fn(async () =>
      response(DASHBOARD_HTML, {
        headers: { 'content-security-policy-report-only': "default-src 'self'" },
      }),
    );

    const outcome = await readDocumentPolicy(windowWith(fetchMock));

    expect(outcome.status).toBe('verified');
    if (outcome.status === 'verified') {
      expect(outcome.policy).toBe("default-src 'self'");
    }
    expect(fetchMock).toHaveBeenCalledWith('https://dashboard.example/', {
      credentials: 'same-origin',
      headers: { Accept: 'text/html' },
    });
  });

  it('prefers the enforcing header when both are present', async () => {
    const outcome = await readDocumentPolicy(
      windowWith(
        jest.fn(async () =>
          response(DASHBOARD_HTML, {
            headers: {
              'content-security-policy': "default-src 'none'",
              'content-security-policy-report-only': "default-src 'self'",
            },
          }),
        ),
      ),
    );

    expect(outcome.status).toBe('verified');
    if (outcome.status === 'verified') {
      expect(outcome.policy).toBe("default-src 'none'");
    }
  });

  it('treats a non-HTML response as outside the dashboard document boundary', async () => {
    const outcome = await readDocumentPolicy(
      windowWith(jest.fn(async () => response('{"ok":true}', { contentType: 'application/json' }))),
    );

    expect(outcome.status).toBe('not-a-dashboard-document');
  });

  it('treats HTML without the dashboard root as outside the policy boundary', async () => {
    const outcome = await readDocumentPolicy(
      windowWith(jest.fn(async () => response('<html><body>Sign in</body></html>'))),
    );

    expect(outcome.status).toBe('not-a-dashboard-document');
  });

  it('fails verification instead of skipping when the fetch rejects', async () => {
    const outcome = await readDocumentPolicy(
      windowWith(
        jest.fn(async () => {
          throw new TypeError('Failed to fetch');
        }),
      ),
    );

    expect(outcome.status).toBe('verification-error');
    if (outcome.status === 'verification-error') {
      expect(outcome.detail).toContain('Failed to fetch');
    }
  });

  it('fails verification when the dashboard shell carries no policy', async () => {
    const outcome = await readDocumentPolicy(
      windowWith(jest.fn(async () => response(DASHBOARD_HTML))),
    );

    expect(outcome.status).toBe('verification-error');
    if (outcome.status === 'verification-error') {
      expect(outcome.detail).toContain('no Content-Security-Policy header');
    }
  });

  it('fails verification when the body cannot be read', async () => {
    const outcome = await readDocumentPolicy(
      windowWith(
        jest.fn(async () => ({
          headers: { get: (name: string) => (name === 'content-type' ? 'text/html' : null) },
          text: async () => {
            throw new Error('stream closed');
          },
        })),
      ),
    );

    expect(outcome.status).toBe('verification-error');
  });
  it('reads the supplied document instead of the one the window shows', async () => {
    const fetchMock = jest.fn(async () =>
      response(DASHBOARD_HTML, {
        headers: { 'content-security-policy-report-only': "default-src 'self'" },
      }),
    );

    const outcome = await readDocumentPolicy(
      windowWith(fetchMock, 'https://auth.example/oauth'),
      'https://dashboard.example/projects/1',
    );

    expect(outcome.status).toBe('verified');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dashboard.example/projects/1',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('sends a valid RequestCredentials value to fetch', async () => {
    let sentInit: RequestInit | undefined;
    // jsdom provides no `Request` constructor, and a mocked `fetch` accepts any object, so
    // validate against the union the Fetch standard defines instead of the mock's argument.
    const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
      sentInit = init;
      return response(DASHBOARD_HTML);
    });

    await readDocumentPolicy(windowWith(fetchMock));

    expect(['omit', 'same-origin', 'include']).toContain(sentInit?.credentials);
  });
});
