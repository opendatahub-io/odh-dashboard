export enum CompareRunsSearchParam {
  RUNS = 'compareRuns',
}

export const experimentsRootPath = '/experiments';
export const globExperimentsAll = `${experimentsRootPath}/*`;

export const experimentsBaseRoute = (registry?: string): string =>
  !registry ? experimentsRootPath : `${experimentsRootPath}/${registry}`;

export const experimentsRunsRoute = (registry?: string, experimentId?: string): string => {
  const basePath = `${experimentsRootPath}/runs`;
  if (!registry) {
    return basePath;
  }
  if (!experimentId) {
    return `${basePath}/${registry}`;
  }
  return `${basePath}/${registry}/${experimentId}`;
};

const generateCompareRunsQueryString = (runIds: string[] = []): string =>
  runIds.length > 0 ? `?${CompareRunsSearchParam.RUNS}=${runIds.join(',')}` : '';

export const experimentsMetricsRoute = (
  registry?: string,
  experimentId?: string,
  runIds?: string[],
): string => {
  const basePath = `${experimentsRootPath}/metrics`;
  if (!registry) {
    return `${basePath}${generateCompareRunsQueryString(runIds)}`;
  }
  if (!experimentId) {
    return `${basePath}/${registry}${generateCompareRunsQueryString(runIds)}`;
  }
  return `${basePath}/${registry}/${experimentId}${generateCompareRunsQueryString(runIds)}`;
};

export const metricsRoute = (registry?: string, runIds?: string[]): string => {
  const basePath = `${experimentsRootPath}/metrics`;
  return !registry
    ? `${basePath}${generateCompareRunsQueryString(runIds)}`
    : `${basePath}/${registry}${generateCompareRunsQueryString(runIds)}`;
};

export const experimentsParamsRoute = (registry?: string, experimentId?: string): string => {
  const basePath = `${experimentsRootPath}/parameters`;
  if (!registry) {
    return basePath;
  }
  if (!experimentId) {
    return `${basePath}/${registry}`;
  }
  return `${basePath}/${registry}/${experimentId}`;
};

export const experimentRunDetailsRoute = (
  registry?: string,
  experimentId?: string,
  runId?: string,
): string => {
  const basePath = `${experimentsRootPath}/runs`;
  if (!registry || !experimentId || !runId) {
    return !registry ? basePath : `${basePath}/${registry}`;
  }
  return `${basePath}/${registry}/${experimentId}/${runId}`;
};
