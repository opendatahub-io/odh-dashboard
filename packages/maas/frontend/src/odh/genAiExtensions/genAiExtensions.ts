import type {
  MaaSModelsExtension,
  GenerateMaaSTokenExtension,
  AIAssetsTabExtension,
} from '@odh-dashboard/gen-ai/extension-points';
import { MODEL_AS_SERVICE_ID } from '~/odh/odhExtensions/odhExtensions';

export type GenAiExtensions =
  | MaaSModelsExtension
  | GenerateMaaSTokenExtension
  | AIAssetsTabExtension;

const GEN_AI_EXTENSIONS: GenAiExtensions[] = [
  {
    type: 'gen-ai.maas/models',
    properties: {
      getMaaSModels: () => import('./maasApiCalls').then((m) => m.getMaaSModelsWrapper),
    },
    flags: {
      required: [MODEL_AS_SERVICE_ID],
    },
  },
  {
    type: 'gen-ai.maas/generate-token',
    properties: {
      generateMaaSToken: () => import('./maasApiCalls').then((m) => m.generateMaaSTokenWrapper),
    },
    flags: {
      required: [MODEL_AS_SERVICE_ID],
    },
  },
  {
    type: 'gen-ai.ai-assets/tab',
    properties: {
      id: 'maasmodels',
      title: 'Models as a service',
      component: () => import('./GenAiMaaSTabWrapper').then((m) => m.default),
    },
    flags: {
      required: [MODEL_AS_SERVICE_ID],
    },
  },
];

export default GEN_AI_EXTENSIONS;
