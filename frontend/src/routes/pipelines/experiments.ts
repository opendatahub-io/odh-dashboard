import { CompareRunsSearchParam } from '#~/concepts/pipelines/content/types';

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

export const experimentsDuplicateRunRoute = (
  namespace: string | undefined,
  experimentId: string,
  runId: string,
): string => `${experimentRunsRoute(namespace, experimentId)}/duplicate/${runId}`;

export const experimentsDuplicateRecurringRunRoute = (
  namespace: string | undefined,
  experimentId: string,
  recurringRunId: string,
): string => `${experimentRecurringRunsRoute(namespace, experimentId)}/duplicate/${recurringRunId}`;

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

export const generateCompareRunsQueryString = (runIds: string[]): string =>
  runIds.length > 0 ? `?${CompareRunsSearchParam.RUNS}=${runIds.join(',')}` : '';

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
