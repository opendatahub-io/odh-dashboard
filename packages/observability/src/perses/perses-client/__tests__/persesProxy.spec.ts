import { fetchPersesDashboardsMetadata } from '../perses-client';

describe('Perses proxy path', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses the supplied base path to discover dashboards', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      headers: new Headers(),
    } as Response);

    await fetchPersesDashboardsMetadata(undefined, '/maas-consumer-portal/perses/api');

    expect(global.fetch).toHaveBeenCalledWith(
      '/maas-consumer-portal/perses/api/api/v1/dashboards',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
    );
  });
});
