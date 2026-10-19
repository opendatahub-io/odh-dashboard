import { OdhDatasourceApi } from '../datasource-api';
import {
  fetchPersesDashboard,
  fetchPersesDashboardsMetadata,
  fetchPersesProjects,
} from '../perses-client';

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

    await fetchPersesDashboardsMetadata(undefined, '/custom-base/perses/api');

    expect(global.fetch).toHaveBeenCalledWith(
      '/custom-base/perses/api/api/v1/dashboards',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
    );
  });

  it('uses the supplied base path for project and global datasource lookups', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      headers: new Headers(),
    } as Response);
    const api = new OdhDatasourceApi('/custom-base/perses/api');

    await api.getDatasource('team-a', { kind: 'PrometheusDatasource' });
    await api.getGlobalDatasource({ kind: 'PrometheusDatasource' });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/custom-base/perses/api/api/v1/projects/team-a/datasources?kind=PrometheusDatasource&default=true',
      expect.any(Object),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/custom-base/perses/api/api/v1/globaldatasources?kind=PrometheusDatasource&default=true',
      expect.any(Object),
    );
  });

  it.each([undefined, '/custom-base/perses/api'])(
    'fetches individual dashboards and projects using proxy path %s',
    async (basePath) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
        headers: new Headers(),
      } as Response);
      const { signal } = new AbortController();

      await fetchPersesDashboard('team a', 'model/dashboard', signal, basePath);
      await fetchPersesProjects(basePath);

      const expectedBasePath = basePath ?? '/perses/api';
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `${expectedBasePath}/api/v1/projects/team%20a/dashboards/model%2Fdashboard`,
        expect.objectContaining({ signal }),
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        `${expectedBasePath}/api/v1/projects`,
        expect.any(Object),
      );
    },
  );

  it('builds metric proxy URLs under the supplied base path', () => {
    const api = new OdhDatasourceApi('/custom-base/perses/api');

    expect(
      api.buildProxyUrl({ project: 'team-a', dashboard: 'model-dashboard', name: 'thanos' }),
    ).toBe(
      '/custom-base/perses/api/proxy/projects/team-a/dashboards/model-dashboard/datasources/thanos',
    );
  });
});
