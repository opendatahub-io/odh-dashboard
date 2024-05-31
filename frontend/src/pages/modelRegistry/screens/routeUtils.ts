export const registeredModelUrl = (rmId?: string, preferredModelRegistry?: string): string =>
  `/modelRegistry/${preferredModelRegistry}/registeredModels/${rmId}`;

export const modelVersionListUrl = (rmId?: string, preferredModelRegistry?: string): string =>
  `${registeredModelUrl(rmId, preferredModelRegistry)}/versions`;

export const modelVersionUrl = (
  mvId: string,
  rmId?: string,
  preferredModelRegistry?: string,
): string => `${registeredModelUrl(rmId, preferredModelRegistry)}/versions/${mvId}`;

export const modelVersionArchiveUrl = (rmId?: string, preferredModelRegistry?: string): string =>
  `/modelRegistry/${preferredModelRegistry}/registeredModels/${rmId}/versions/archive`;

export const registeredModelArchiveUrl = (preferredModelRegistry?: string): string =>
  `/modelRegistry/${preferredModelRegistry}/registeredModels/archive`;

export const registeredModelsUrl = (preferredModelRegistry?: string): string =>
  `/modelRegistry/${preferredModelRegistry}/registeredModels`;

export const registeredModelArchiveDetailsUrl = (
  rmId?: string,
  preferredModelRegistry?: string,
): string => `/modelRegistry/${preferredModelRegistry}/registeredModels/archive/${rmId}`;

export const modelVersionArchiveDetailsUrl = (
  mvId: string,
  rmId?: string,
  preferredModelRegistry?: string,
): string =>
  `/modelRegistry/${preferredModelRegistry}/registeredModels/${rmId}/versions/archive/${mvId}`;
