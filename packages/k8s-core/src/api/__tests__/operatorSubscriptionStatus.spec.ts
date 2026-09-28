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
      json: () =>
        Promise.resolve({
          channel: 'stable',
          installedCSV: 'rhods-operator.v3.0.0',
          installPlanRefNamespace: 'redhat-ods-operator',
          lastUpdated: '2025-01-01T00:00:00Z',
        }),
    } as Response);

    await expect(
      fetchOperatorSubscriptionStatus('/maas-consumer-portal', { signal: undefined }),
    ).resolves.toEqual({
      channel: 'stable',
      installedCSV: 'rhods-operator.v3.0.0',
      installPlanRefNamespace: 'redhat-ods-operator',
      lastUpdated: '2025-01-01T00:00:00Z',
    });
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

  it.each([
    ['installedCSV', null],
    ['installPlanRefNamespace', 42],
    ['lastUpdated', false],
  ])('rejects an invalid optional %s value', async (field, invalidValue) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ channel: 'stable', [field]: invalidValue }),
    } as Response);

    await expect(fetchOperatorSubscriptionStatus()).rejects.toThrow(
      'Invalid operator subscription status response',
    );
  });
});
