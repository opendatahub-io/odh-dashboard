import { fetchPersesDashboardsMetadata } from '@odh-dashboard/observability/dashboard';
import { PERSES_PROXY_BASE_PATH } from '../paths';

describe('portal Perses proxy', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses the portal-prefixed path to discover dashboards', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      headers: new Headers(),
    } as Response);

    await fetchPersesDashboardsMetadata(undefined, PERSES_PROXY_BASE_PATH);

    expect(global.fetch).toHaveBeenCalledWith(
      '/maas-consumer-portal/perses/api/api/v1/dashboards',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
    );
  });
});
