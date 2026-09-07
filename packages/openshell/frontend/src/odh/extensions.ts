import type {
  AreaExtension,
  RouteExtension,
  TabRoutePageExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const PLUGIN_OPENSHELL = 'plugin-openshell';

const extensions: (
  AreaExtension | TabRoutePageExtension | TabRouteTabExtension | RouteExtension
)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_OPENSHELL,
      featureFlags: ['openShell'],
    },
  },
  {
    type: 'app.tab-route/page',
    flags: {
      required: [PLUGIN_OPENSHELL],
    },
    properties: {
      id: 'openshell-tab-page',
      title: 'OpenShell',
      href: '/ai-hub/openshell',
      path: '/ai-hub/openshell/*',
      group: '2_openshell',
      section: 'ai-hub',
      objectType: 'openshell',
    },
  },
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [PLUGIN_OPENSHELL],
    },
    properties: {
      pageId: 'openshell-tab-page',
      id: 'workspaces',
      title: 'Workspaces',
      singleTabTitle: 'Workspaces',
      component: () => import('./OpenShellWrapper'),
      group: '1_workspaces',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_OPENSHELL],
    },
    properties: {
      path: '/ai-hub/openshell/workspaces/:workspaceId/*',
      component: () => import('./OpenShellDetailRoutes'),
    },
  },
];

export default extensions;
