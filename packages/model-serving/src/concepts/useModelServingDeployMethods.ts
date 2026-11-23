import { useExtensions } from '@odh-dashboard/plugin-core';
import type { Deployment } from '../../extension-points';
import {
  isModelServingDeploy,
  type ModelServingDeploy,
} from '../../extension-points/deployment-wizard';

/**
 * Deploy-method extensions are the usable serving backends (KServe InferenceService,
 * LLMD, etc.). Prefer this over `model-serving.platform` when deciding whether any
 * serving UI can actually deploy — the platform shell may stay loaded for project
 * enablement while individual deploy methods are flag-gated.
 */
export const useModelServingDeployMethods = (): {
  deployMethods: ModelServingDeploy<Deployment>[];
  hasDeployMethods: boolean;
} => {
  const deployMethods = useExtensions<ModelServingDeploy<Deployment>>(isModelServingDeploy);
  return {
    deployMethods,
    hasDeployMethods: deployMethods.length > 0,
  };
};
