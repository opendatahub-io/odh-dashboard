export const registeredModelUrl = (rmId?: string, preferredModelRegistry?: string): string =>
  `/modelRegistry/${preferredModelRegistry}/registeredModels/${rmId}`;

export const modelVersionUrl = (
  mvId: string,
  rmId?: string,
  preferredModelRegistry?: string,
): string => `${registeredModelUrl(rmId, preferredModelRegistry)}/versions/${mvId}`;
