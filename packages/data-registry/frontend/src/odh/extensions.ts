import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';

const PLUGIN_DATA_REGISTRY = 'plugin-data-registry';

const extensions: Extension[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_DATA_REGISTRY,
      featureFlags: ['dataRegistry'],
      reliantAreas: [SupportedArea.DATA_REGISTRY],
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
      description:
        'View and manage this project’s data assets. Data assets are metadata records that help users discover and understand external data. They store information like location, format, and schema, but not the data itself.',
      href: '/ai-hub/data',
      path: '/ai-hub/data/*',
      group: '4_data',
      section: 'ai-hub',
      objectType: 'data-registry',
      label: 'Tech Preview',
      hidePageTitleOnPaths: ['browse/assets', 'browse/collections'],
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
      singleTabTitle: 'Data assets',
      objectType: 'data-registry',
      component: () => import('./DataRegistryWrapper'),
    },
  },
];

export default extensions;
