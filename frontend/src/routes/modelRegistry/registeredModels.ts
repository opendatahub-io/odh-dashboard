import { modelRegistryRoute } from './registryBase';

export const registeredModelsRoute = (preferredModelRegistry?: string): string =>
  `${modelRegistryRoute(preferredModelRegistry)}/registered-models`;

export const registeredModelRoute = (rmId = '', preferredModelRegistry?: string): string =>
  `${registeredModelsRoute(preferredModelRegistry)}/${rmId}`;

// Note: added for compatibility with model-serving - we'll remove all these old utils when we're ready to consume them from the MR module
export const registeredModelDeploymentsRoute = (
  rmId = '',
  preferredModelRegistry?: string,
): string => `${registeredModelRoute(rmId, preferredModelRegistry)}/deployments`;
