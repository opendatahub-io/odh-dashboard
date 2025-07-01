export enum CompareRunsSearchParam {
  RUNS = 'compareRuns',
}

export const experimentsRootPath = '/experiments';
export const globExperimentsAll = `${experimentsRootPath}/*`;

export const experimentsBaseRoute = (registry?: string): string =>
  !registry ? experimentsRootPath : `${experimentsRootPath}/${registry}`;

export const experimentsRoute = (registry?: string, experimentId?: string): string =>
  !experimentId
    ? experimentsBaseRoute(registry)
    : `${experimentsBaseRoute(registry)}/${experimentId}`;

export const experimentsRunsRoute = (registry?: string, experimentId?: string): string =>
  `${experimentsRoute(registry, experimentId)}/runs`;

export const generateCompareRunsQueryString = (runIds: string[] = []): string =>
  runIds.length > 0 ? `?${CompareRunsSearchParam.RUNS}=${runIds.join(',')}` : '';

export const compareRunsRoute = (registry?: string, runIds?: string[]): string =>
  `${experimentsBaseRoute(registry)}/compareRuns${generateCompareRunsQueryString(runIds)}`;
