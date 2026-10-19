/* eslint-disable @cspell/spellchecker */
import type {
  AreaExtension,
  NavExtension,
  ProjectDetailsTab,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';

// This must match SupportedArea.NOTEBOOKS_V2 in frontend/src/concepts/areas/types.ts
const PLUGIN_NOTEBOOKS = 'plugin-notebooks';

const extensions: (NavExtension | RouteExtension | AreaExtension | ProjectDetailsTab)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_NOTEBOOKS,
      featureFlags: ['workbenchesV2'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_NOTEBOOKS],
    },
    properties: {
      id: 'notebooks-kf-workspacekinds',
      title: 'Workbench templates',
      href: '/notebooks/workspacekinds',
      section: 'settings-environment-setup',
      path: '/notebooks/workspacekinds/*',
      label: 'Dev Preview',
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
  {
    type: 'app.project-details/tab',
    properties: {
      id: 'workbenches-v2',
      title: 'Workbenches v2',
      component: () => import('./WorkspacesProjectDetailsTab'),
    },
    flags: {
      required: [PLUGIN_NOTEBOOKS],
    },
  },
];

export default extensions;
