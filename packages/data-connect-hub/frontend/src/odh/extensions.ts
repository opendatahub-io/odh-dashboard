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
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.PLUGIN_DATA_CONNECT_HUB],
    },
    properties: {
      id: 'data-connect-hub-view',
      title: 'Connections',
      href: '/ai-hub/connections',
      section: 'ai-hub',
      path: '/ai-hub/connections/*',
      group: '4_connections',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.PLUGIN_DATA_CONNECT_HUB],
    },
    properties: {
      path: '/ai-hub/connections/*',
      component: () => import('./DataConnectHubWrapper'),
    },
  },
];

export default extensions;
