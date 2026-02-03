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
      featureFlags: ['autoRag'],
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
      section: 'gen-ai-studio',
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
