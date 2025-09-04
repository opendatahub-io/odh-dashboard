import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import {
  aiAssetsRootPath,
  chatPlaygroundRootPath,
  globAiAssetsAll,
  globChatPlaygroundAll,
} from '~/app/utilities/routes';

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
      id: 'gen-ai-studio',
      title: 'Gen AI studio',
      group: '4_gen_ai_studio',
      iconRef: () => import('./GenAiStudioIcon'),
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
      href: chatPlaygroundRootPath,
      section: 'gen-ai-v3',
      path: globChatPlaygroundAll,
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
      href: aiAssetsRootPath,
      section: 'gen-ai-v3',
      path: globAiAssetsAll,
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_GEN_AI],
    },
    properties: {
      path: '/gen-ai/*',
      component: () => import('./GenAiWrapper'),
    },
  },
];

export default extensions;
