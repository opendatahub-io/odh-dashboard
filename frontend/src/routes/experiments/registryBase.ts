export enum CompareRunsSearchParam {
  RUNS = 'compareRuns',
}

export const experimentsRootPath = '/experiments';
export const globExperimentsAll = `${experimentsRootPath}/*`;

export const experimentsBaseRoute = (registry?: string): string =>
  !registry ? experimentsRootPath : `${experimentsRootPath}/${registry}`;

export const experimentsRunsRoute = (registry?: string, experimentId?: string): string =>
  !experimentId
    ? experimentsBaseRoute(registry)
    : `${experimentsBaseRoute(registry)}/runs/${experimentId}`;

const generateCompareRunsQueryString = (runIds: string[] = []): string =>
  runIds.length > 0 ? `?${CompareRunsSearchParam.RUNS}=${runIds.join(',')}` : '';

export const experimentsMetricsRoute = (
  registry?: string,
  experimentId?: string,
  runIds?: string[],
): string =>
  !experimentId
    ? experimentsBaseRoute(registry)
    : `${experimentsBaseRoute(registry)}/metrics/${experimentId}${generateCompareRunsQueryString(
        runIds,
      )}`;

export const metricsRoute = (registry?: string, runIds?: string[]): string =>
  `${experimentsBaseRoute(registry)}/metrics${generateCompareRunsQueryString(runIds)}`;

export const experimentsParamsRoute = (registry?: string, experimentId?: string): string =>
  !experimentId
    ? experimentsBaseRoute(registry)
    : `${experimentsBaseRoute(registry)}/params/${experimentId}`;

export const experimentRunDetailsRoute = (
  registry?: string,
  experimentId?: string,
  runId?: string,
): string =>
  !experimentId || !runId
    ? experimentsBaseRoute(registry)
    : `${experimentsBaseRoute(registry)}/runs/${experimentId}/${runId}`;
