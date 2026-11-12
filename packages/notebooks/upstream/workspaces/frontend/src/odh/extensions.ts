/* eslint-disable @cspell/spellchecker */
import type {
  AreaExtension,
  NavExtension,
  ProjectDetailsTab,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';

// This must match SupportedArea.PLUGIN_NOTEBOOKS in packages/plugin-core/src/areas/types.ts
const PLUGIN_NOTEBOOKS = 'plugin-notebooks';

const extensions: (NavExtension | RouteExtension | AreaExtension | ProjectDetailsTab)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_NOTEBOOKS,
      featureFlags: ['workspaces'],
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
      section: 'settings-environment-setup',
      path: '/notebooks/workspacekinds/*',
      label: 'Dev Preview',
      accessReview: {
        group: 'kubeflow.org',
        resource: 'workspacekinds',
        verb: 'create',
      },
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
      id: 'workspaces',
      title: 'Workspaces',
      component: () => import('./WorkspacesProjectDetailsTab'),
    },
    flags: {
      required: [PLUGIN_NOTEBOOKS],
    },
  },
];

export default extensions;
