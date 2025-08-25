import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const PLUGIN_LLAMA_STACK = 'llama-stack-plugin';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_LLAMA_STACK,
      devFlags: ['LLama Stack Plugin'],
    },
  },
  {
    type: 'app.navigation/section',
    flags: {
      required: [PLUGIN_LLAMA_STACK],
    },
    properties: {
      id: 'gen-ai-v3',
      title: 'GEN AI V3',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_LLAMA_STACK],
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
    type: 'app.route',
    flags: {
      required: [PLUGIN_LLAMA_STACK],
    },
    properties: {
      path: '/chat-playground/*',
      component: () => import('./LlamaStackWrapper'),
    },
  },
];

export default extensions;
