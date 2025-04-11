import { modelVersionListRoute } from './modelVersions';

export const modelVersionArchiveRoute = (rmId?: string, preferredModelRegistry?: string): string =>
  `${modelVersionListRoute(rmId, preferredModelRegistry)}/archive`;

export const modelVersionArchiveDetailsRoute = (
  mvId: string,
  rmId?: string,
  preferredModelRegistry?: string,
): string => `${modelVersionArchiveRoute(rmId, preferredModelRegistry)}/${mvId}`;
