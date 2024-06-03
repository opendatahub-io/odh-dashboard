import {
  routePipelineRunCloneNamespace,
  routePipelineRunCreateNamespace,
  routePipelineRunDetailsNamespace,
  routePipelineRunJobCloneNamespace,
  routePipelineRunJobDetailsNamespace,
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
    : routePipelineRunJobCloneNamespace(namespace, recurringRunId);

export const scheduleRunRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentsScheduleRunRoute(namespace, experimentId)
    : routePipelineRunCreateNamespace(namespace);

export const createRunRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentsCreateRunRoute(namespace, experimentId)
    : routePipelineRunCreateNamespace(namespace);

export const scheduleDetailsRoute = (
  namespace: string,
  recurringRunId: string,
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentScheduleDetailsRoute(namespace, experimentId, recurringRunId)
    : routePipelineRunJobDetailsNamespace(namespace, recurringRunId);

export const runDetailsRoute = (
  namespace: string,
  runId: string,
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentRunDetailsRoute(namespace, experimentId, runId)
    : routePipelineRunDetailsNamespace(namespace, runId);

export const cloneRunRoute = (
  namespace: string,
  runId: string,
  experimentId: string | undefined,
): string =>
  experimentId
    ? experimentsCloneRunRoute(namespace, experimentId, runId)
    : routePipelineRunCloneNamespace(namespace, runId);
