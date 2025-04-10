import { registeredModelRoute } from './registeredModelsRoute';

export const modelVersionListRoute = (rmId?: string, preferredModelRegistry?: string): string =>
  `${registeredModelRoute(rmId, preferredModelRegistry)}/versions`;

export const modelVersionRoute = (
  mvId: string,
  rmId?: string,
  preferredModelRegistry?: string,
): string => `${modelVersionListRoute(rmId, preferredModelRegistry)}/${mvId}`;

export const modelVersionDeploymentsRoute = (
  mvId: string,
  rmId?: string,
  preferredModelRegistry?: string,
): string => `${modelVersionRoute(mvId, rmId, preferredModelRegistry)}/deployments`;
