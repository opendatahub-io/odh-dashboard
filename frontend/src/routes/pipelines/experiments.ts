export const experimentsRootPath = '/experiments';
export const globExperimentsAll = `${experimentsRootPath}/*`;

export const experimentsBaseRoute = (namespace?: string): string =>
  !namespace ? experimentsRootPath : `${experimentsRootPath}/${namespace}`;

export const experimentsTabRoute = (
  namespace: string | undefined,
  tabId: string | number,
): string => `${experimentsBaseRoute(namespace)}/${tabId}`;

export const experimentsCreateRunRoute = (
  namespace: string | undefined,
  experimentId: string,
): string => `${experimentRunsRoute(namespace, experimentId)}/create`;

export const experimentsCreateRecurringRunRoute = (
  namespace: string | undefined,
  experimentId: string,
): string => `${experimentRecurringRunsRoute(namespace, experimentId)}/create`;

export const experimentsCloneRunRoute = (
  namespace: string | undefined,
  experimentId: string,
  runId: string,
): string => `${experimentRunsRoute(namespace, experimentId)}/clone/${runId}`;

export const experimentsCloneRecurringRunRoute = (
  namespace: string | undefined,
  experimentId: string,
  recurringRunId: string,
): string => `${experimentRecurringRunsRoute(namespace, experimentId)}/clone/${recurringRunId}`;

export const experimentRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
): string =>
  !experimentId
    ? experimentsBaseRoute(namespace)
    : `${experimentsBaseRoute(namespace)}/${experimentId}`;

export const experimentRunsRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
): string => `${experimentRoute(namespace, experimentId)}/runs`;

export const experimentArchivedRunsRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
): string => `${experimentRunsRoute(namespace, experimentId)}/archived`;

export const experimentRecurringRunsRoute = (
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

export const experimentRecurringRunDetailsRoute = (
  namespace: string,
  experimentId: string | undefined,
  recurringRunId: string,
): string =>
  !experimentId || !recurringRunId
    ? experimentsBaseRoute(namespace)
    : `${experimentRecurringRunsRoute(namespace, experimentId)}/${recurringRunId}`;

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
