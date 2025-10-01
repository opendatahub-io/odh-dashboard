import {
  experimentRecurringRunDetailsRoute,
  experimentRunDetailsRoute,
  experimentsDuplicateRecurringRunRoute,
  experimentsDuplicateRunRoute,
  experimentsCreateRecurringRunRoute,
  experimentsCreateRunRoute,
  generateCompareRunsQueryString,
  experimentsCompareRunsRoute,
  experimentsManageCompareRunsRoute,
} from './experiments';

export const duplicateRecurringRunRoute = (
  namespace: string,
  recurringRunId: string,
  experimentId?: string,
): string =>
  experimentId
    ? experimentsDuplicateRecurringRunRoute(namespace, experimentId, recurringRunId)
    : globalDuplicatePipelineRecurringRunRoute(namespace, recurringRunId);

export const createRecurringRunRoute = (namespace: string, experimentId?: string): string =>
  experimentId
    ? experimentsCreateRecurringRunRoute(namespace, experimentId)
    : globalCreatePipelineRecurringRunRoute(namespace);

export const createRunRoute = (namespace: string, experimentId?: string): string =>
  experimentId
    ? experimentsCreateRunRoute(namespace, experimentId)
    : globalCreatePipelineRunRoute(namespace);

export const recurringRunDetailsRoute = (
  namespace: string,
  recurringRunId: string,
  experimentId?: string,
): string =>
  experimentId
    ? experimentRecurringRunDetailsRoute(namespace, experimentId, recurringRunId)
    : globalPipelineRecurringRunDetailsRoute(namespace, recurringRunId);

export const runDetailsRoute = (namespace: string, runId: string, experimentId?: string): string =>
  experimentId
    ? experimentRunDetailsRoute(namespace, experimentId, runId)
    : globalPipelineRunDetailsRoute(namespace, runId);

export const duplicateRunRoute = (
  namespace: string,
  runId: string,
  experimentId?: string,
): string =>
  experimentId
    ? experimentsDuplicateRunRoute(namespace, experimentId, runId)
    : globalDuplicatePipelineRunRoute(namespace, runId);

export const compareRunsRoute = (
  namespace: string,
  runIds: string[],
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentsCompareRunsRoute(namespace, experimentId, runIds)
    : globalCompareRunsRoute(namespace, runIds);

export const manageCompareRunsRoute = (
  namespace: string,
  runIds: string[],
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentsManageCompareRunsRoute(namespace, experimentId, runIds)
    : globalManageCompareRunsRoute(namespace, runIds);

export const pipelineRunsRootPath = '/develop-train/pipelines/runs';
export const globPipelineRunsAll = `${pipelineRunsRootPath}/*`;

export const pipelineRunsBaseRoute = (namespace?: string): string =>
  !namespace ? pipelineRunsRootPath : `${pipelineRunsRootPath}/${namespace}`;

export const globalPipelineRunsRoute = (namespace: string): string =>
  `${pipelineRunsBaseRoute(namespace)}/runs`;

export const globalPipelineRunsVersionRoute = (
  namespace: string,
  pipelineVersionId: string,
): string => `${globalPipelineRunsRoute(namespace)}/active?pipeline_version=${pipelineVersionId}`;

export const globalArchivedPipelineRunsRoute = (namespace: string): string =>
  `${globalPipelineRunsRoute(namespace)}/archived`;

export const globalPipelineRecurringRunsRoute = (namespace: string): string =>
  `${pipelineRunsBaseRoute(namespace)}/schedules`;

export const globalPipelineRecurringRunsVersionRoute = (
  namespace: string,
  pipelineVersionId: string,
): string => `${globalPipelineRecurringRunsRoute(namespace)}?pipeline_version=${pipelineVersionId}`;

export const globalPipelineRunDetailsRoute = (namespace: string, runId: string): string =>
  `${globalPipelineRunsRoute(namespace)}/${runId}`;

export const globalPipelineRecurringRunDetailsRoute = (
  namespace: string,
  recurringRunId: string,
): string => `${globalPipelineRecurringRunsRoute(namespace)}/${recurringRunId}`;

export const globalCompareRunsRoute = (namespace: string, runIds: string[]): string =>
  `${pipelineRunsBaseRoute(namespace)}/compare-runs${generateCompareRunsQueryString(runIds)}`;

export const globalManageCompareRunsRoute = (namespace: string, runIds: string[]): string =>
  `${pipelineRunsBaseRoute(namespace)}/compare-runs/add${generateCompareRunsQueryString(runIds)}`;

export const globalCreatePipelineRunRoute = (namespace: string): string =>
  `${globalPipelineRunsRoute(namespace)}/create`;

export const globalDuplicatePipelineRunRoute = (namespace: string, runId: string): string =>
  `${globalPipelineRunsRoute(namespace)}/duplicate/${runId}`;

export const globalCreatePipelineRecurringRunRoute = (namespace: string): string =>
  `${globalPipelineRecurringRunsRoute(namespace)}/create`;

export const globalDuplicatePipelineRecurringRunRoute = (
  namespace: string,
  recurringRunId: string,
): string => `${globalPipelineRecurringRunsRoute(namespace)}/duplicate/${recurringRunId}`;
