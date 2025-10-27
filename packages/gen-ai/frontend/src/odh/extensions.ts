import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
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
  globGenAiAll,
} from '~/app/utilities/routes';
import type { AIAssetsTabExtension } from '~/odh/extension-points';

const PLUGIN_GEN_AI = 'plugin-gen-ai';
const MODEL_AS_SERVICE = 'model-as-service';

const extensions: (NavExtension | RouteExtension | AreaExtension | AIAssetsTabExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_GEN_AI,
      requiredComponents: [DataScienceStackComponent.LLAMA_STACK_OPERATOR],
      featureFlags: ['genAiStudio'],
    },
  },
  {
    type: 'app.area',
    properties: {
      id: MODEL_AS_SERVICE,
      reliantAreas: [PLUGIN_GEN_AI],
      featureFlags: ['modelAsService'],
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
      iconRef: () => import('./GenAiStudioNavIcon'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_GEN_AI],
    },
    properties: {
      id: 'chat-playground',
      title: 'Playground',
      href: chatPlaygroundRootPath,
      section: 'gen-ai-studio',
      path: globChatPlaygroundAll,
      label: 'Tech Preview',
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
      section: 'gen-ai-studio',
      path: globAiAssetsAll,
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_GEN_AI],
    },
    properties: {
      path: globGenAiAll,
      component: () => import('./GenAiWrapper'),
    },
  },
  // AI Assets Tab Extensions
  {
    type: 'gen-ai.ai-assets/tab',
    flags: {
      required: [PLUGIN_GEN_AI],
    },
    properties: {
      id: 'models',
      title: 'Models',
      component: () => import('../app/AIAssets/AIAssetsModelsTab').then((m) => m.default),
    },
  },
  {
    type: 'gen-ai.ai-assets/tab',
    flags: {
      required: [PLUGIN_GEN_AI],
    },
    properties: {
      id: 'mcpservers',
      title: 'MCP servers',
      component: () => import('../app/AIAssets/AIAssetsMCPTab').then((m) => m.default),
    },
  },
  {
    type: 'gen-ai.ai-assets/tab',
    flags: {
      required: [MODEL_AS_SERVICE],
    },
    properties: {
      id: 'maasmodels',
      title: 'Models as a service',
      component: () => import('../app/AIAssets/AIAssetsMaaSTab').then((m) => m.default),
      label: 'Developer Preview',
    },
  },
];

export default extensions;
