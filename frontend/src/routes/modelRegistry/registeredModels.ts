import { modelRegistryRoute } from './registryBase';

export const registeredModelsRoute = (preferredModelRegistry?: string): string =>
  `${modelRegistryRoute(preferredModelRegistry)}/registered-models`;

export const registeredModelRoute = (rmId = '', preferredModelRegistry?: string): string =>
  `${registeredModelsRoute(preferredModelRegistry)}/${rmId}`;
