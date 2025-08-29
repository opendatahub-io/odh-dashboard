import type {
  HrefNavItemExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const PLUGIN_GEN_AI = 'plugin-gen-ai';

const extensions: (AreaExtension | HrefNavItemExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_GEN_AI,
      reliantAreas: [SupportedArea.LLAMA_STACK_CHAT_BOT],
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
