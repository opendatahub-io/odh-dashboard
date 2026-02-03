import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const AUTORAG = 'autorag';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: AUTORAG,
      requiredComponents: [],
      featureFlags: ['autoRag'], // Todo: You need to add this feature flag.
    },
  },
  {
    type: 'app.navigation/section',
    flags: {
      required: [AUTORAG],
    },
    properties: {
      id: 'autorag',
      title: 'AutoRAG',
      group: '7_autorag',
      iconRef: () => import('./ModArchNavIcon'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [AUTORAG],
    },
    properties: {
      id: 'autorag-view',
      title: 'AutoRAG',
      href: '/autorag/main-view',
      section: 'autorag',
      path: '/autorag/main-view/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [],
    },
    properties: {
      path: '/autorag/main-view/*',
      component: () => import('./ModArchWrapper'),
    },
  },
];

export default extensions;
