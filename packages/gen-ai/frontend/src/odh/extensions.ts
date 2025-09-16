import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const PLUGIN_GEN_AI = 'plugin-gen-ai';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_GEN_AI,
      devFlags: ['Gen AI plugin'],
    },
  },
  {
    type: 'app.navigation/section',
    flags: {
      required: [PLUGIN_GEN_AI],
    },
    properties: {
      id: 'gen-ai-v3',
      title: 'Gen AI Studio',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_GEN_AI],
    },
    properties: {
      id: 'chat-playground',
      title: 'Chat playground',
      href: '/chat-playground',
      section: 'gen-ai-v3',
      path: '/chat-playground/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_GEN_AI],
    },
    properties: {
      id: 'ai-assets',
      title: 'AI asset endpoints',
      href: '/ai-assets',
      section: 'gen-ai-v3',
      path: '/ai-assets/*',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_GEN_AI],
    },
    properties: {
      path: '/chat-playground/*',
      component: () => import('./GenAiWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_GEN_AI],
    },
    properties: {
      path: '/ai-assets/*',
      component: () => import('./AIAssetsWrapper'),
    },
  },
];

export default extensions;
