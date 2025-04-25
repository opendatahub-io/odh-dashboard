import {
  ServingLabel,
  ServingPlatformSelectionCard,
  ParseProjectForPlatform,
  ServingID,
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

const ID = 'MODEL_MESH';

const extensions: [ServingID, ServingLabel, ParseProjectForPlatform, ServingPlatformSelectionCard] =
  [
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
        text: 'Model Mesh',
      },
    },
    {
      type: 'model-serving.project/parse-for-id',
      properties: {
        servingId: ID,
        content: () => import('./src/determineServing').then((module) => module.isProjectModelMesh),
      },
    },
    {
      type: 'model-serving.selection-card',
      properties: {
        servingId: ID,
        title: 'Multi-model serving platform',
        description:
          'Multiple models can be deployed on one shared model server. Choose this option when you want to deploy a number of small or medium-sized models that can share the server resources.',
        // NamespaceApplicationCase.MODEL_MESH_PROMOTION
        promotionKey: 1,
      },
    },
  ];

export default extensions;
