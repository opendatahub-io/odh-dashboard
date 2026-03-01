export const evalHubRootPath = '/evaluation';

export const evalHubEvaluationsRoute = (namespace?: string): string =>
  !namespace ? evalHubRootPath : `${evalHubRootPath}/${namespace}`;
