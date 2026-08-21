import extensions from '../extensions';
import { LLM_ACCELERATOR_CONFIGS_TAB_PATH } from '../../src/settings/llmAcceleratorConfigs/paths';
import { TOPOLOGY_CONFIGS_TAB_PATH } from '../../src/settings/topologyConfigs/paths';
import { ROUTING_CONFIGS_TAB_PATH } from '../../src/settings/routingConfigs/paths';

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

  it('should gate the accelerator tab on its own feature areas only', () => {
    expect(acceleratorTab?.flags).toEqual({
      required: ['llmd-serving', 'ADMIN_USER', 'vllm-on-maas'],
    });
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

  it('should redirect the old standalone accelerator URL to the tab', () => {
    const redirectRoute = routeExtensions.find(
      (extension) =>
        extension.properties.path ===
        '/settings/model-resources-operations/llm-accelerator-configs/*',
    );

    expect(redirectRoute).toBeDefined();
    expect(redirectRoute?.flags).toEqual({
      required: ['llmd-serving', 'ADMIN_USER', 'vllm-on-maas'],
    });
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

  it('should gate the topology tab on its own feature areas only', () => {
    expect(topologyTab?.flags).toEqual({
      required: ['llmd-topology-configs', 'ADMIN_USER'],
    });
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

  it('should redirect the old standalone topology URL to the tab', () => {
    const redirectRoute = routeExtensions.find(
      (extension) =>
        extension.properties.path ===
        '/settings/model-resources-operations/llmd-topology-configurations/*',
    );

    expect(redirectRoute).toBeDefined();
    expect(redirectRoute?.flags).toEqual({
      required: ['llmd-topology-configs', 'ADMIN_USER'],
    });
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

  it('should gate the routing tab on its own feature areas only', () => {
    expect(routingTab?.flags).toEqual({
      required: ['llmd-topology-configs', 'ADMIN_USER'],
    });
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

  it('should redirect the old standalone routing URL to the tab', () => {
    const redirectRoute = routeExtensions.find(
      (extension) =>
        extension.properties.path ===
        '/settings/model-resources-operations/llmd-routing-configurations/*',
    );

    expect(redirectRoute).toBeDefined();
    expect(redirectRoute?.flags).toEqual({
      required: ['llmd-topology-configs', 'ADMIN_USER'],
    });
  });
});
