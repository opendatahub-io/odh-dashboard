import { modelRegistryRoute } from './registryBase';
import { registeredModelRoute } from './registeredModels';

export const registerModelRoute = (preferredModelRegistry?: string): string =>
  `${modelRegistryRoute(preferredModelRegistry)}/register/model`;

export const registerVersionRoute = (preferredModelRegistry?: string): string =>
  `${modelRegistryRoute(preferredModelRegistry)}/register/version`;

export const registerVersionForModelRoute = (
  rmId?: string,
  preferredModelRegistry?: string,
): string => `${registeredModelRoute(rmId, preferredModelRegistry)}/register/version`;
