export const evalHubRootPath = '/develop-train/eval-hub';

export const evalHubEvaluationsRoute = (namespace?: string): string =>
  !namespace ? evalHubRootPath : `${evalHubRootPath}/${namespace}`;
