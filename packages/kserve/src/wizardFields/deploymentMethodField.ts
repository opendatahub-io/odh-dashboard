import type { DeploymentMethodFieldOverride } from '@odh-dashboard/model-serving/types/form-data';

export const LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY = 'legacy';

const LEGACY_OPTION = {
  key: LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY,
  label: 'Inference service',
  description:
    'Deploy a model using a serving runtime template. Not compatible with Models as a Service.',
  order: 3,
};

export const legacyDeploymentMethodOverride: DeploymentMethodFieldOverride = {
  id: 'deploymentMethod',
  type: 'modifier',
  isActive: () => true,
  options: [LEGACY_OPTION],
  suggestion: (clusterSettings) => (!clusterSettings?.isLLMdDefault ? LEGACY_OPTION : undefined),
};
