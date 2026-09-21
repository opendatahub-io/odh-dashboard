import type { Extension } from '@openshift/dynamic-plugin-sdk';

const PLUGIN_DATA_REGISTRY = 'plugin-data-registry';

const extensions: Extension[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_DATA_REGISTRY,
      featureFlags: ['dataRegistry'],
    },
  },
  {
    type: 'app.tab-route/page',
    flags: {
      required: [PLUGIN_DATA_REGISTRY],
    },
    properties: {
      id: 'data-tab-page',
      title: 'Data',
      href: '/ai-hub/data',
      path: '/ai-hub/data/*',
      group: '4_data',
      section: 'ai-hub',
      objectType: 'data-registry',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [PLUGIN_DATA_REGISTRY],
    },
    properties: {
      pageId: 'data-tab-page',
      id: 'browse',
      title: 'Browse',
      singleTabTitle: 'Data',
      objectType: 'data-registry',
      component: () => import('./DataRegistryWrapper'),
    },
  },
];

export default extensions;
