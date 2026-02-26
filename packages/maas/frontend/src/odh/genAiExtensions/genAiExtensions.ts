import type { AIAssetsTabExtension } from '@odh-dashboard/gen-ai/extension-points';
import { MODEL_AS_SERVICE_ID } from '~/odh/odhExtensions/odhExtensions';

export type GenAiExtensions = AIAssetsTabExtension;

const GEN_AI_EXTENSIONS: GenAiExtensions[] = [
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
