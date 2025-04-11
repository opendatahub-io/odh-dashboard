import { registeredModelsRoute } from './registeredModels';

export const registeredModelArchiveRoute = (preferredModelRegistry?: string): string =>
  `${registeredModelsRoute(preferredModelRegistry)}/archive`;

export const registeredModelArchiveDetailsRoute = (
  rmId = '',
  preferredModelRegistry?: string,
): string => `${registeredModelArchiveRoute(preferredModelRegistry)}/${rmId}`;

export const archiveModelVersionListRoute = (
  rmId?: string,
  preferredModelRegistry?: string,
): string => `${registeredModelArchiveDetailsRoute(rmId, preferredModelRegistry)}/versions`;

export const archiveModelVersionDetailsRoute = (
  mvId: string,
  rmId?: string,
  preferredModelRegistry?: string,
): string => `${archiveModelVersionListRoute(rmId, preferredModelRegistry)}/${mvId}`;
