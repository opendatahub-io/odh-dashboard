export const experimentsRootPath = '/experiments';
export const globExperimentsAll = `${experimentsRootPath}/*`;

export const experimentsBaseRoute = (namespace: string | undefined): string =>
  !namespace ? experimentsRootPath : `${experimentsRootPath}/${namespace}`;

export const experimentsTabRoute = (
  namespace: string | undefined,
  tabId: string | number,
): string => `${experimentsBaseRoute(namespace)}/${tabId}`;

export const experimentsCreateRunRoute = (
  namespace: string | undefined,
  experimentId: string,
): string => `${experimentRunsRoute(namespace, experimentId)}/create`;

export const experimentsScheduleRunRoute = (
  namespace: string | undefined,
  experimentId: string,
): string => `${experimentSchedulesRoute(namespace, experimentId)}/create`;

export const experimentsCloneRunRoute = (
  namespace: string | undefined,
  experimentId: string,
  runId: string,
): string => `${experimentRunsRoute(namespace, experimentId)}/clone/${runId}`;

export const experimentsCloneScheduleRoute = (
  namespace: string | undefined,
  experimentId: string,
  recurringRunId: string,
): string => `${experimentSchedulesRoute(namespace, experimentId)}/clone/${recurringRunId}`;

export const experimentRunsRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
): string =>
  !experimentId
    ? experimentsBaseRoute(namespace)
    : `${experimentsBaseRoute(namespace)}/${experimentId}/runs`;

export const experimentSchedulesRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
): string =>
  !experimentId
    ? experimentsBaseRoute(namespace)
    : `${experimentsBaseRoute(namespace)}/${experimentId}/schedules`;

export const experimentRunDetailsRoute = (
  namespace: string,
  experimentId: string | undefined,
  runId: string,
): string =>
  !experimentId || !runId
    ? experimentsBaseRoute(namespace)
    : `${experimentRunsRoute(namespace, experimentId)}/${runId}`;

export const experimentScheduleDetailsRoute = (
  namespace: string,
  experimentId: string | undefined,
  recurringRunId: string,
): string =>
  !experimentId || !recurringRunId
    ? experimentsBaseRoute(namespace)
    : `${experimentSchedulesRoute(namespace, experimentId)}/${recurringRunId}`;

const generateCompareRunsQueryString = (runIds: string[]) =>
  runIds.length > 0 ? `?runs=${runIds.join(',')}` : '';

export const experimentsCompareRunsRoute = (
  namespace: string,
  experimentId: string,
  runIds: string[],
): string =>
  `${experimentsBaseRoute(namespace)}/${experimentId}/compareRuns${generateCompareRunsQueryString(
    runIds,
  )}`;

export const experimentsManageCompareRunsRoute = (
  namespace: string,
  experimentId: string,
  runIds: string[],
): string =>
  `${experimentsBaseRoute(
    namespace,
  )}/${experimentId}/compareRuns/add${generateCompareRunsQueryString(runIds)}`;
