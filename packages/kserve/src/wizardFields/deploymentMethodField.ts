import type { DeploymentMethodFieldOverride } from '@odh-dashboard/model-serving/types/form-data';

export const LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY = 'legacy';

export const legacyDeploymentMethodOverride: DeploymentMethodFieldOverride = {
  id: 'deploymentMethod',
  type: 'modifier',
  isActive: () => true,
  options: [
    {
      key: LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY,
      label: 'Legacy deployment',
      description:
        'Deploy using a serving runtime template. Use this option for non-LLM models or for compatibility with previous deployments. This method does not support Models as a Service.',
      order: 3,
    },
  ],
};
