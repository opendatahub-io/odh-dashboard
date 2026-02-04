import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const PLUGIN_AUTORAG = 'autorag';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_AUTORAG,
      requiredComponents: [],
      featureFlags: ['autorag'], // Todo: You need to add this feature flag.
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_AUTORAG],
    },
    properties: {
      id: 'autorag',
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
      component: () => import('./AppWrapper'),
    },
  },
];

export default extensions;
