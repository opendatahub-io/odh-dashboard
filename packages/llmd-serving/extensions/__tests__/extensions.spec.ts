import extensions from '../extensions';
import {
  LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH,
  LLM_ACCELERATOR_CONFIGS_TAB_PATH,
} from '../../src/settings/llmAcceleratorConfigs/paths';
import {
  TOPOLOGY_CONFIGS_STANDALONE_PATH,
  TOPOLOGY_CONFIGS_TAB_PATH,
} from '../../src/settings/topologyConfigs/paths';
import {
  ROUTING_CONFIGS_STANDALONE_PATH,
  ROUTING_CONFIGS_TAB_PATH,
} from '../../src/settings/routingConfigs/paths';

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

describe('llm-d topology configuration extensions', () => {
  const topologyTab = extensions.find(
    (extension) =>
      extension.type === 'app.tab-route/tab' &&
      extension.properties.id === 'topology-configurations',
  );

  const topologyFormPaths = [
    `${TOPOLOGY_CONFIGS_TAB_PATH}/add/:topologyType`,
    `${TOPOLOGY_CONFIGS_TAB_PATH}/edit/:configName`,
    `${TOPOLOGY_CONFIGS_TAB_PATH}/duplicate/:configName`,
  ];

  it('should register the topology tab on the model deployment settings page', () => {
    expect(topologyTab).toBeDefined();
    expect(topologyTab?.properties).toEqual(
      expect.objectContaining({
        pageId: 'model-deployment-settings',
        id: 'topology-configurations',
        title: 'llm-d topology configurations',
        group: '4_topology',
      }),
    );
  });

  // The forms must not be tab content: TabRoutePage renders tab content beneath the
  // page title and tab bar, which would leave the form with two page headings.
  it('should register the form routes as standalone breakout routes outside the tab', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    topologyFormPaths.forEach((formPath) => {
      expect(paths).toContain(formPath);
    });
  });

  it('should gate the breakout form routes exactly as the tab is gated', () => {
    const formRoutes = routeExtensions.filter((extension) =>
      topologyFormPaths.includes(extension.properties.path),
    );

    expect(formRoutes).toHaveLength(topologyFormPaths.length);
    formRoutes.forEach((route) => {
      expect(route.flags).toEqual(topologyTab?.flags);
    });
  });

  // Guards the constants duplicated into extensions.ts, which cannot import runtime
  // values from src. A refactor that changes paths.ts alone should fail here.
  it('should build standalone routes from the shared standalone path constant', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    expect(paths).toContain(`${TOPOLOGY_CONFIGS_STANDALONE_PATH}/*`);
  });

  it('should point the standalone nav item at the standalone path', () => {
    const navItem = extensions.find(
      (extension) =>
        extension.type === 'app.navigation/href' &&
        extension.properties.id === 'settings-llmd-topology-configurations',
    );

    expect(navItem?.properties).toEqual(
      expect.objectContaining({
        href: TOPOLOGY_CONFIGS_STANDALONE_PATH,
        path: `${TOPOLOGY_CONFIGS_STANDALONE_PATH}/*`,
      }),
    );
  });
});

describe('llm-d routing configuration extensions', () => {
  const routingTab = extensions.find(
    (extension) =>
      extension.type === 'app.tab-route/tab' &&
      extension.properties.id === 'routing-configurations',
  );

  const routingFormPaths = [
    `${ROUTING_CONFIGS_TAB_PATH}/add`,
    `${ROUTING_CONFIGS_TAB_PATH}/edit/:configName`,
    `${ROUTING_CONFIGS_TAB_PATH}/duplicate/:configName`,
  ];

  it('should register the routing tab on the model deployment settings page', () => {
    expect(routingTab).toBeDefined();
    expect(routingTab?.properties).toEqual(
      expect.objectContaining({
        pageId: 'model-deployment-settings',
        id: 'routing-configurations',
        title: 'llm-d routing configurations',
        group: '5_routing',
      }),
    );
  });

  // The forms must not be tab content: TabRoutePage renders tab content beneath the
  // page title and tab bar, which would leave the form with two page headings.
  it('should register the form routes as standalone breakout routes outside the tab', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    routingFormPaths.forEach((formPath) => {
      expect(paths).toContain(formPath);
    });
  });

  it('should gate the breakout form routes exactly as the tab is gated', () => {
    const formRoutes = routeExtensions.filter((extension) =>
      routingFormPaths.includes(extension.properties.path),
    );

    expect(formRoutes).toHaveLength(routingFormPaths.length);
    formRoutes.forEach((route) => {
      expect(route.flags).toEqual(routingTab?.flags);
    });
  });

  // Guards the constants duplicated into extensions.ts, which cannot import runtime
  // values from src. A refactor that changes paths.ts alone should fail here.
  it('should build standalone routes from the shared standalone path constant', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    expect(paths).toContain(`${ROUTING_CONFIGS_STANDALONE_PATH}/*`);
  });

  it('should point the standalone nav item at the standalone path', () => {
    const navItem = extensions.find(
      (extension) =>
        extension.type === 'app.navigation/href' &&
        extension.properties.id === 'settings-llmd-routing-configurations',
    );

    expect(navItem?.properties).toEqual(
      expect.objectContaining({
        href: ROUTING_CONFIGS_STANDALONE_PATH,
        path: `${ROUTING_CONFIGS_STANDALONE_PATH}/*`,
      }),
    );
  });
});
