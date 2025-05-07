import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes.js';
import type {
  ModelServingPlatform,
  ModelServingPlatformCard,
} from '@odh-dashboard/model-serving/extension-points';
// eslint-disable-next-line import/no-extraneous-dependencies
import { addSupportServingPlatformProject } from '@odh-dashboard/internal/api/index';
// eslint-disable-next-line import/no-extraneous-dependencies
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';

const extensions: (ModelServingPlatform | ModelServingPlatformCard)[] = [
  {
    type: 'model-serving.platform',
    properties: {
      id: 'kserve',
      name: 'KServe',
      isInstalled: () => Promise.resolve(true),
      enable: (project: ProjectKind) =>
        addSupportServingPlatformProject(
          project.metadata.name,
          NamespaceApplicationCase.KSERVE_PROMOTION,
        ),
      disable: (project: ProjectKind) =>
        addSupportServingPlatformProject(
          project.metadata.name,
          NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM,
        ),
      isEnabled: (project: ProjectKind) =>
        project.metadata.labels?.['modelmesh-enabled'] === 'false',
    },
  },
  {
    type: 'model-serving.platform/card',
    properties: {
      platform: 'kserve',
      title: 'Single-model serving platform',
      description:
        'Each model is deployed on its own model server. Choose this option when you want to deploy a large model such as a large language model (LLM).',
      selectText: 'Select single-model',
    },
  },
  {
    type: 'model-serving.platform/card',
    properties: {
      platform: 'modelmesh-dummy',
      title: 'Multi-model serving platform (dummy)',
      description:
        'Multiple models can be deployed on one shared model server. Useful for deploying a number of small or medium-sized models that can share the server resources.',
      selectText: 'Select multi-model',
    },
  },
];

export default extensions;
