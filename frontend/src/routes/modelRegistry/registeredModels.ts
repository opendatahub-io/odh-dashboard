import { modelRegistryRoute } from './registryBase';

const registeredModelsRoute = (preferredModelRegistry?: string): string =>
  `${modelRegistryRoute(preferredModelRegistry)}/registered-models`;

export const registeredModelRoute = (rmId = '', preferredModelRegistry?: string): string =>
  `${registeredModelsRoute(preferredModelRegistry)}/${rmId}`;

export const registeredModelDeploymentsRoute = (
  rmId = '',
  preferredModelRegistry?: string,
): string => `${registeredModelRoute(rmId, preferredModelRegistry)}/deployments`;
