import extensions from '../../extensions';
import { SERVING_RUNTIME_TEMPLATES_TAB_PATH } from '../../src/settings/servingRuntimeTemplates/paths';

const routeExtensions = extensions.filter((extension) => extension.type === 'app.route');

const servingRuntimeTemplatesTab = extensions.find(
  (extension) =>
    extension.type === 'app.tab-route/tab' &&
    extension.properties.id === 'serving-runtime-templates',
);

const formPaths = [
  `${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/add`,
  `${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/edit/:servingRuntimeName`,
  `${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/duplicate/:servingRuntimeName`,
];

describe('serving runtime templates extensions', () => {
  it('should register the serving runtime templates tab on the model deployment settings page', () => {
    expect(servingRuntimeTemplatesTab).toBeDefined();
    expect(servingRuntimeTemplatesTab?.properties).toEqual(
      expect.objectContaining({
        pageId: 'model-deployment-settings',
        id: 'serving-runtime-templates',
        title: 'Serving runtime templates',
        group: '2_serving-runtimes',
      }),
    );
  });

  // The forms must not be tab content: TabRoutePage renders tab content beneath the
  // page title and tab bar, which would leave the form with two page headings.
  it('should register the form routes as standalone breakout routes outside the tab', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    formPaths.forEach((formPath) => {
      expect(paths).toContain(formPath);
    });
  });

  it('should gate the breakout form routes exactly as the tab is gated', () => {
    const formRoutes = routeExtensions.filter((extension) =>
      formPaths.includes(extension.properties.path),
    );

    expect(formRoutes).toHaveLength(formPaths.length);
    formRoutes.forEach((route) => {
      expect(route.flags).toEqual(servingRuntimeTemplatesTab?.flags);
    });
  });

  // Guards the path constant duplicated into extensions.ts, which cannot import
  // runtime values from src. A refactor that changes paths.ts alone should fail here.
  it('should build the breakout routes from the shared tab path constant', () => {
    const paths = routeExtensions
      .map((extension) => extension.properties.path)
      .filter((path) => path.startsWith(`${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/`));

    expect(paths.toSorted()).toEqual(formPaths.toSorted());
  });
});

describe('serving runtime legacy URL redirects', () => {
  it('should redirect the former standalone and v2 base URLs to the tab', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    expect(paths).toContain('/settings/model-resources-operations/serving-runtimes/*');
    expect(paths).toContain('/servingRuntimes/*');
  });

  it('should register the legacy v2 add and edit sub-path aliases', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    expect(paths).toContain('/servingRuntimes/addServingRuntime');
    // The edit alias must stay in the `/*` wildcard form: buildV2RedirectElement
    // resolves a wildcard `to` via WildcardRedirect, preserving the captured runtime
    // name. A `:servingRuntimeName` param path would resolve to AbsoluteRedirect and
    // drop the name — guard against reintroducing that.
    expect(paths).toContain('/servingRuntimes/editServingRuntime/*');
    expect(paths).not.toContain('/servingRuntimes/editServingRuntime/:servingRuntimeName');
  });

  it('should gate the legacy redirects like the tab', () => {
    const redirectPaths = [
      '/settings/model-resources-operations/serving-runtimes/*',
      '/servingRuntimes/*',
      '/servingRuntimes/addServingRuntime',
      '/servingRuntimes/editServingRuntime/*',
    ];
    const redirects = routeExtensions.filter((extension) =>
      redirectPaths.includes(extension.properties.path),
    );

    expect(redirects).toHaveLength(redirectPaths.length);
    redirects.forEach((route) => {
      expect(route.flags).toEqual(servingRuntimeTemplatesTab?.flags);
    });
  });
});
