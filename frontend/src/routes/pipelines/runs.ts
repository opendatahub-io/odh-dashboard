import {
  pipelineVersionDuplicateRunRoute,
  pipelineVersionDuplicateRecurringRunRoute,
  pipelineVersionCreateRunRoute,
  pipelineVersionCreateRecurringRunRoute,
  pipelineVersionRunDetailsRoute,
  pipelineVersionRecurringRunDetailsRoute,
} from './global';
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
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentsDuplicateRecurringRunRoute(namespace, experimentId, recurringRunId)
    : pipelineId && pipelineVersionId
    ? pipelineVersionDuplicateRecurringRunRoute(
        namespace,
        pipelineId,
        pipelineVersionId,
        recurringRunId,
      )
    : globalDuplicatePipelineRecurringRunRoute(namespace, recurringRunId);

export const createRecurringRunRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentsCreateRecurringRunRoute(namespace, experimentId)
    : pipelineId && pipelineVersionId
    ? pipelineVersionCreateRecurringRunRoute(namespace, pipelineId, pipelineVersionId)
    : globalCreatePipelineRecurringRunRoute(namespace);

export const createRunRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentsCreateRunRoute(namespace, experimentId)
    : pipelineId && pipelineVersionId
    ? pipelineVersionCreateRunRoute(namespace, pipelineId, pipelineVersionId)
    : globalCreatePipelineRunRoute(namespace);

export const recurringRunDetailsRoute = (
  namespace: string,
  recurringRunId: string,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentRecurringRunDetailsRoute(namespace, experimentId, recurringRunId)
    : pipelineId && pipelineVersionId
    ? pipelineVersionRecurringRunDetailsRoute(
        namespace,
        pipelineId,
        pipelineVersionId,
        recurringRunId,
      )
    : globalPipelineRecurringRunDetailsRoute(namespace, recurringRunId);

export const runDetailsRoute = (
  namespace: string,
  runId: string,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentRunDetailsRoute(namespace, experimentId, runId)
    : pipelineId && pipelineVersionId
    ? pipelineVersionRunDetailsRoute(namespace, pipelineId, pipelineVersionId, runId)
    : globalPipelineRunDetailsRoute(namespace, runId);

export const duplicateRunRoute = (
  namespace: string,
  runId: string,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentsDuplicateRunRoute(namespace, experimentId, runId)
    : pipelineId && pipelineVersionId
    ? pipelineVersionDuplicateRunRoute(namespace, pipelineId, pipelineVersionId, runId)
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

export const pipelineRunsRootPath = '/pipelineRuns';
export const globPipelineRunsAll = `${pipelineRunsRootPath}/*`;

export const pipelineRunsBaseRoute = (namespace?: string): string =>
  !namespace ? pipelineRunsRootPath : `${pipelineRunsRootPath}/${namespace}`;

export const globalPipelineRunsRoute = (namespace: string | undefined): string =>
  `${pipelineRunsBaseRoute(namespace)}/runs`;

export const globalArchivedPipelineRunsRoute = (namespace: string | undefined): string =>
  `${globalPipelineRunsRoute(namespace)}/archived`;

export const globalPipelineRecurringRunsRoute = (namespace: string | undefined): string =>
  `${pipelineRunsBaseRoute(namespace)}/schedules`;

export const globalPipelineRunDetailsRoute = (namespace: string, runId: string): string =>
  `${globalPipelineRunsRoute(namespace)}/${runId}`;

export const globalPipelineRecurringRunDetailsRoute = (
  namespace: string,
  recurringRunId: string,
): string => `${globalPipelineRecurringRunsRoute(namespace)}/${recurringRunId}`;

export const globalCompareRunsRoute = (namespace: string, runIds: string[]): string =>
  `${pipelineRunsBaseRoute(namespace)}/compareRuns${generateCompareRunsQueryString(runIds)}`;

export const globalManageCompareRunsRoute = (namespace: string, runIds: string[]): string =>
  `${pipelineRunsBaseRoute(namespace)}/compareRuns/add${generateCompareRunsQueryString(runIds)}`;

export const globalCreatePipelineRunRoute = (namespace: string | undefined): string =>
  `${globalPipelineRunsRoute(namespace)}/create`;

export const globalDuplicatePipelineRunRoute = (
  namespace: string | undefined,
  runId: string,
): string => `${globalPipelineRunsRoute(namespace)}/duplicate/${runId}`;

export const globalCreatePipelineRecurringRunRoute = (namespace: string | undefined): string =>
  `${globalPipelineRecurringRunsRoute(namespace)}/create`;

export const globalDuplicatePipelineRecurringRunRoute = (
  namespace: string | undefined,
  recurringRunId: string,
): string => `${globalPipelineRecurringRunsRoute(namespace)}/duplicate/${recurringRunId}`;
