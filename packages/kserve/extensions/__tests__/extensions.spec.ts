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
