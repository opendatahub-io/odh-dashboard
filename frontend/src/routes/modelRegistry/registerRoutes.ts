import { modelRegistryRoute } from './registryBaseRoute';
import { registeredModelRoute } from './registeredModelsRoute';

export const registerModelRoute = (preferredModelRegistry?: string): string =>
  `${modelRegistryRoute(preferredModelRegistry)}/registerModel`;

export const registerVersionRoute = (preferredModelRegistry?: string): string =>
  `${modelRegistryRoute(preferredModelRegistry)}/registerVersion`;

export const registerVersionForModelRoute = (
  rmId?: string,
  preferredModelRegistry?: string,
): string => `${registeredModelRoute(rmId, preferredModelRegistry)}/registerVersion`;
