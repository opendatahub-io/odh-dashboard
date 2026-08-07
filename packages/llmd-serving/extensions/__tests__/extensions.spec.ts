import extensions from '../extensions';
import {
  LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH,
  LLM_ACCELERATOR_CONFIGS_TAB_PATH,
} from '../../src/settings/llmAcceleratorConfigs/paths';

const routeExtensions = extensions.filter((extension) => extension.type === 'app.route');

const acceleratorTab = extensions.find(
  (extension) =>
    extension.type === 'app.tab-route/tab' &&
    extension.properties.id === 'llm-accelerator-configurations',
);

const acceleratorFormPaths = [
  `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/add`,
  `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/edit/:configName`,
  `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/duplicate/:configName`,
];

describe('LLM accelerator configuration extensions', () => {
  it('should register the accelerator tab on the model deployment settings page', () => {
    expect(acceleratorTab).toBeDefined();
    expect(acceleratorTab?.properties).toEqual(
      expect.objectContaining({
        pageId: 'model-deployment-settings',
        id: 'llm-accelerator-configurations',
        title: 'LLM accelerator configurations',
        group: '3_accelerator',
      }),
    );
  });

  // The forms must not be tab content: TabRoutePage renders tab content beneath the
  // page title and tab bar, which would leave the form with two page headings.
  it('should register the form routes as standalone breakout routes outside the tab', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    acceleratorFormPaths.forEach((formPath) => {
      expect(paths).toContain(formPath);
    });
  });

  it('should gate the breakout form routes exactly as the tab is gated', () => {
    const formRoutes = routeExtensions.filter((extension) =>
      acceleratorFormPaths.includes(extension.properties.path),
    );

    expect(formRoutes).toHaveLength(acceleratorFormPaths.length);
    formRoutes.forEach((route) => {
      expect(route.flags).toEqual(acceleratorTab?.flags);
    });
  });

  // Guards the constants duplicated into extensions.ts, which cannot import runtime
  // values from src. A refactor that changes paths.ts alone should fail here.
  it('should build standalone routes from the shared standalone path constant', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    expect(paths).toContain(`${LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH}/*`);
  });

  it('should redirect the standalone path to the tab path', () => {
    const navItem = extensions.find(
      (extension) =>
        extension.type === 'app.navigation/href' &&
        extension.properties.id === 'settings-llm-accelerator-configs',
    );

    expect(navItem?.properties).toEqual(
      expect.objectContaining({
        href: LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH,
        path: `${LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH}/*`,
      }),
    );
  });
});
