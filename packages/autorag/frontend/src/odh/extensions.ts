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
      href: '/gen-ai-studio/autorag',
      section: 'gen-ai-studio',
      path: '/gen-ai-studio/autorag/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [],
    },
    properties: {
      path: '/gen-ai-studio/autorag/*',
      component: () => import('./AutoRagWrapper'),
    },
  },
];

export default extensions;
