import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.PLUGIN_DATA_CONNECT_HUB,
      featureFlags: ['dataConnectHub'],
    },
  },
  {
    type: 'app.navigation/section',
    flags: {
      required: [SupportedArea.PLUGIN_DATA_CONNECT_HUB],
    },
    properties: {
      id: 'data-connect-hub',
      title: 'Data Connect Hub',
      group: '7_data_connect_hub_studio',
      iconRef: () => import('./DataConnectHubNavIcon'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.PLUGIN_DATA_CONNECT_HUB],
    },
    properties: {
      id: 'data-connect-hub-view',
      title: 'Data Connect Hub',
      href: '/data-connect-hub/main-view',
      section: 'data-connect-hub',
      path: '/data-connect-hub/main-view/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.PLUGIN_DATA_CONNECT_HUB],
    },
    properties: {
      path: '/data-connect-hub/main-view/*',
      component: () => import('./DataConnectHubWrapper'),
    },
  },
];

export default extensions;
