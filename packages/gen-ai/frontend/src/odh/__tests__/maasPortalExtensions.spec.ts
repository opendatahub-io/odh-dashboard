import { PluginStore } from '@odh-dashboard/plugin-core';
import dashboardExtensions, { GRID } from '~/odh/extensions';
import portalExtensions from '~/odh/maasPortalExtensions';

const findModelsExtensions = (store: PluginStore) =>
  store
    .getExtensions()
    .filter(
      (extension) =>
        (extension.type === 'app.route' && extension.properties.path === '/maas/models') ||
        (extension.type === 'app.navigation/href' && extension.properties.id === 'maas-models'),
    );

describe('MaaS Models portal extensions', () => {
  it('should expose the Models navigation and route in the portal when grid is enabled', () => {
    const store = new PluginStore({ genAi: portalExtensions });
    store.setFeatureFlags({ [GRID]: true });
    expect(findModelsExtensions(store)).toHaveLength(2);
    expect(findModelsExtensions(store)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'app.navigation/href',
          properties: expect.objectContaining({ title: 'Models', href: '/maas/models' }),
        }),
      ]),
    );
  });

  it.each([undefined, false])('should hide the navigation and route when grid is %s', (grid) => {
    const store = new PluginStore({ genAi: portalExtensions });
    if (grid !== undefined) {
      store.setFeatureFlags({ [GRID]: grid });
    }
    expect(findModelsExtensions(store)).toHaveLength(0);
  });

  it('should remove both navigation and route when grid is disabled after being enabled', () => {
    const store = new PluginStore({ genAi: portalExtensions });
    store.setFeatureFlags({ [GRID]: true });
    expect(findModelsExtensions(store)).toHaveLength(2);
    store.setFeatureFlags({ [GRID]: false });
    expect(findModelsExtensions(store)).toHaveLength(0);
  });

  it('should never register the page in RHOAI even when grid and Gen AI are enabled', () => {
    const store = new PluginStore({ genAi: dashboardExtensions });
    store.setFeatureFlags({
      [GRID]: true,
      genAiStudio: true,
      'plugin-gen-ai': true,
      modelAsService: true,
    });
    expect(findModelsExtensions(store)).toHaveLength(0);
  });
});
