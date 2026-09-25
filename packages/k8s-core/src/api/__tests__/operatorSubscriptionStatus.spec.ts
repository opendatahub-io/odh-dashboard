import { fetchOperatorSubscriptionStatus } from '../operatorSubscriptionStatus';

describe('fetchOperatorSubscriptionStatus', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches the Core BFF endpoint from the supplied host path', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ channel: 'stable' }),
    } as Response);

    await expect(
      fetchOperatorSubscriptionStatus('/maas-consumer-portal', { signal: undefined }),
    ).resolves.toEqual({ channel: 'stable' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/maas-consumer-portal/api/operator-subscription-status',
      { signal: undefined },
    );
  });

  it('rejects an invalid response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    } as Response);

    await expect(fetchOperatorSubscriptionStatus()).rejects.toThrow(
      'Invalid operator subscription status response',
    );
  });
});
