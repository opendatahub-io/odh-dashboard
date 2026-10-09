import { fetchOperatorSubscriptionStatus } from '../operatorSubscriptionStatus';

describe('fetchOperatorSubscriptionStatus', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches the endpoint from the supplied host path', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          channel: 'stable',
          installedCSV: 'rhods-operator.v3.0.0',
          installPlanRefNamespace: 'redhat-ods-operator',
          lastUpdated: '2025-01-01T00:00:00Z',
        }),
    } as Response);

    await expect(
      fetchOperatorSubscriptionStatus('/maas-portal', { signal: undefined }),
    ).resolves.toEqual({
      channel: 'stable',
      installedCSV: 'rhods-operator.v3.0.0',
      installPlanRefNamespace: 'redhat-ods-operator',
      lastUpdated: '2025-01-01T00:00:00Z',
    });
    expect(global.fetch).toHaveBeenCalledWith('/maas-portal/api/operator-subscription-status', {
      signal: undefined,
    });
  });

  it('accepts a response without a channel', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ installedCSV: 'rhods-operator.v3.0.0' }),
    } as Response);

    await expect(fetchOperatorSubscriptionStatus()).resolves.toEqual({
      installedCSV: 'rhods-operator.v3.0.0',
    });
  });

  it('accepts an empty channel', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ channel: '' }),
    } as Response);

    await expect(fetchOperatorSubscriptionStatus()).resolves.toEqual({ channel: '' });
  });

  it('uses the Fastify error message when the request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Unable to get subscription information' }),
    } as Response);

    await expect(fetchOperatorSubscriptionStatus()).rejects.toThrow(
      'Unable to get subscription information',
    );
  });

  it('falls back to the status message when the error response has no message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: 'Bad Gateway' }),
    } as Response);

    await expect(fetchOperatorSubscriptionStatus()).rejects.toThrow(
      'Unable to load operator subscription status (502)',
    );
  });

  it('falls back to the status message when the error response is not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    } as Response);

    await expect(fetchOperatorSubscriptionStatus()).rejects.toThrow(
      'Unable to load operator subscription status (503)',
    );
  });
});
