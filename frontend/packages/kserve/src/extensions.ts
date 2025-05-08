import type {
  ModelServingPlatformExtension,
  ModelServingPlatformCard,
} from '@odh-dashboard/model-serving/extension-points';

const extensions: (ModelServingPlatformExtension | ModelServingPlatformCard)[] = [
  {
    type: 'model-serving.platform',
    properties: {
      id: 'kserve',
      name: 'KServe',
      isInstalled: () => import('./managePlatform').then((m) => m.isInstalled),
      isEnabled: () => import('./managePlatform').then((m) => m.isEnabled),
      enable: () => import('./managePlatform').then((m) => m.enable),
      disable: () => import('./managePlatform').then((m) => m.disable),
    },
  } satisfies ModelServingPlatformExtension,
  {
    type: 'model-serving.platform/card',
    properties: {
      platform: 'kserve',
      title: 'Single-model serving platform',
      description:
        'Each model is deployed on its own model server. Choose this option when you want to deploy a large model such as a large language model (LLM).',
      selectText: 'Select single-model',
    },
  } satisfies ModelServingPlatformCard,
  // {
  //   type: 'model-serving.platform',
  //   properties: {
  //     id: 'modelmesh-dummy',
  //     name: 'ModelMesh (dummy)',
  //     isInstalled: () => Promise.resolve(true),
  //     isEnabled: (project: ProjectKind) =>
  //       project.metadata.labels?.['modelmesh-enabled'] === 'true',
  //     enable: (project: ProjectKind) =>
  //       addSupportServingPlatformProject(
  //         project.metadata.name,
  //         NamespaceApplicationCase.MODEL_MESH_PROMOTION,
  //       ),
  //     disable: (project: ProjectKind) =>
  //       addSupportServingPlatformProject(
  //         project.metadata.name,
  //         NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM,
  //       ),
  //   },
  // } satisfies ModelServingPlatform,
  // {
  //   type: 'model-serving.platform/card',
  //   properties: {
  //     platform: 'modelmesh-dummy',
  //     title: 'Multi-model serving platform (dummy)',
  //     description:
  //       'Multiple models can be deployed on one shared model server. Useful for deploying a number of small or medium-sized models that can share the server resources.',
  //     selectText: 'Select multi-model',
  //   },
  // } satisfies ModelServingPlatformCard,
];

export default extensions;
