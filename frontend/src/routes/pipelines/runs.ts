import {
  routePipelineRunCloneNamespacePipelinesPage,
  routePipelineRunCreateNamespacePipelinesPage,
  routePipelineRunDetailsNamespacePipelinesPage,
  routePipelineRecurringRunCloneNamespacePipelinesPage,
  routePipelineRecurringRunDetailsNamespacePipelinesPage,
} from './global';
import {
  experimentRunDetailsRoute,
  experimentScheduleDetailsRoute,
  experimentsCloneRunRoute,
  experimentsCloneScheduleRoute,
  experimentsCreateRunRoute,
  experimentsScheduleRunRoute,
} from './experiments';

export const cloneScheduleRoute = (
  namespace: string,
  recurringRunId: string,
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentsCloneScheduleRoute(namespace, experimentId, recurringRunId)
    : routePipelineRecurringRunCloneNamespacePipelinesPage(namespace, recurringRunId);

export const scheduleRunRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentsScheduleRunRoute(namespace, experimentId)
    : routePipelineRunCreateNamespacePipelinesPage(namespace);

export const createRunRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentsCreateRunRoute(namespace, experimentId)
    : routePipelineRunCreateNamespacePipelinesPage(namespace);

export const scheduleDetailsRoute = (
  namespace: string,
  recurringRunId: string,
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentScheduleDetailsRoute(namespace, experimentId, recurringRunId)
    : routePipelineRecurringRunDetailsNamespacePipelinesPage(namespace, recurringRunId);

export const runDetailsRoute = (
  namespace: string,
  runId: string,
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentRunDetailsRoute(namespace, experimentId, runId)
    : routePipelineRunDetailsNamespacePipelinesPage(namespace, runId);

export const cloneRunRoute = (
  namespace: string,
  runId: string,
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentsCloneRunRoute(namespace, experimentId, runId)
    : routePipelineRunCloneNamespacePipelinesPage(namespace, runId);
