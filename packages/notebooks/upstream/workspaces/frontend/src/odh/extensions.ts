/* eslint-disable @cspell/spellchecker */
import type {
  AreaExtension,
  NavExtension,
  ProjectDetailsTab,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';

// This must match SupportedArea.NOTEBOOKS_V2 in frontend/src/concepts/areas/types.ts
const NOTEBOOKS_V2 = 'notebooks-v2';

const extensions: (NavExtension | RouteExtension | AreaExtension | ProjectDetailsTab)[] = [
  {
    type: 'app.area',
    properties: {
      id: NOTEBOOKS_V2,
      featureFlags: ['notebooksV2'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [NOTEBOOKS_V2],
    },
    properties: {
      id: 'notebooks-kf-workspacekinds',
      title: 'Workbench Templates',
      href: '/notebooks/workspacekinds',
      section: 'settings-environment-setup',
      path: '/notebooks/workspacekinds/*',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [NOTEBOOKS_V2],
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
      required: [NOTEBOOKS_V2],
    },
  },
];

export default extensions;
