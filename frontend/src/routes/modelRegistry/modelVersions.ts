import { registeredModelRoute } from './registeredModels';

const modelVersionListRoute = (rmId?: string, preferredModelRegistry?: string): string =>
  `${registeredModelRoute(rmId, preferredModelRegistry)}/versions`;

export const modelVersionRoute = (
  mvId: string,
  rmId?: string,
  preferredModelRegistry?: string,
): string => `${modelVersionListRoute(rmId, preferredModelRegistry)}/${mvId}`;
