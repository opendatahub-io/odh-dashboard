import type {
  HrefNavItemExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const PLUGIN_GEN_AI = 'plugin-gen-ai';

const extensions: (AreaExtension | HrefNavItemExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_GEN_AI,
      devFlags: ['Gen AI plugin'],
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
      section: 'models',
      path: '/chat-playground/*',
    },
  },
];

export default extensions;
