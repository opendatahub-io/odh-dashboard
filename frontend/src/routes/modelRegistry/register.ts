import { modelRegistryRoute } from './registryBase';
import { registeredModelRoute } from './registeredModels';

export const registerModelRoute = (preferredModelRegistry?: string): string =>
  `${modelRegistryRoute(preferredModelRegistry)}/registerModel`;

export const registerVersionRoute = (preferredModelRegistry?: string): string =>
  `${modelRegistryRoute(preferredModelRegistry)}/registerVersion`;

export const registerVersionForModelRoute = (
  rmId?: string,
  preferredModelRegistry?: string,
): string => `${registeredModelRoute(rmId, preferredModelRegistry)}/registerVersion`;
