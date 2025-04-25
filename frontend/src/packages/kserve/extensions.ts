import {
  ParseProjectForPlatform,
  ServingID,
  ServingLabel,
  ServingPlatformSelectionCard,
} from '~/packages/modelServing/extension-points';

/**
 * This file is used to declare the extensions that are available in the application.
 * It must not import any other files to prevent loading code on startup.
 *
 * Stick to `type` imports only.
 */

// eg. Remove once we have a real extensions
// const extensions: (TabExtension | PageExtension)[] = [
//   {
//     type: 'tab',
//     properties: {
//       label: 'Test tab',
//       content: () => import('./TabComponent'),
//     },
//   },
// ];

const ID = 'KSERVE';

const extensions: (
  | ServingID
  | ServingLabel
  | ParseProjectForPlatform
  | ServingPlatformSelectionCard
)[] = [
  {
    type: 'model-serving.id',
    properties: {
      servingId: ID,
    },
  },
  {
    type: 'model-serving.label',
    properties: {
      servingId: ID,
      text: 'KServe',
    },
  },
  {
    type: 'model-serving.project/parse-for-id',
    properties: {
      servingId: ID,
      content: () => import('./src/determineServing').then((module) => module.isProjectKServe),
    },
  },
  {
    type: 'model-serving.selection-card',
    properties: {
      servingId: ID,
      // NamespaceApplicationCase.KSERVE_PROMOTION
      promotionKey: 2,
      title: 'Single-model serving platform',
      description:
        'Each model is deployed on its own model server. Choose this option when you want to deploy a large model such as a large language model (LLM).',
    },
  },
  {
    type: 'model-serving.selection-card',
    properties: {
      servingId: ID,
      // NamespaceApplicationCase.KSERVE_PROMOTION
      promotionKey: 2,
      title: 'Really Cool KServe',
      description:
        'Each model is deployed on its own model server. Choose this option when you want to deploy a large model such as a large language model (LLM).',
    },
  },
];

export default extensions;
