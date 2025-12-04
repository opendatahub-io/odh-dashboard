import type {
  AreaExtension,
  NavExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const reliantAreas = ['workbenches'];
const PLUGIN_NOTEBOOKS = 'notebooks-plugin';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_NOTEBOOKS,
      reliantAreas,
      devFlags: ['Notebooks Plugin'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_NOTEBOOKS],
    },
    properties: {
      id: 'notebooks-kf-workspaces',
      title: 'Workspaces',
      href: '/notebooks/workspaces',
      section: 'ai-hub',
      path: '/notebooks/workspaces/*',
      group: '1_aihub',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_NOTEBOOKS],
    },
    properties: {
      id: 'notebooks-kf-workspacekinds',
      title: 'Workspace Kinds',
      href: '/notebooks/workspacekinds',
      section: 'notebooks',
      path: '/notebooks/workspacekinds/*',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_NOTEBOOKS],
    },
    properties: {
      path: '/notebooks/*',
      component: () => import('./NotebooksWrapper'),
    },
  },
];

export default extensions;
