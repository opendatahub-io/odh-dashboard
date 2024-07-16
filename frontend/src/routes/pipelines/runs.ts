import {
  pipelineVersionCloneRunRoute,
  pipelineVersionCloneRecurringRunRoute,
  pipelineVersionCreateRunRoute,
  pipelineVersionCreateRecurringRunRoute,
  pipelineVersionRunDetailsRoute,
  pipelineVersionRecurringRunDetailsRoute,
} from './global';
import {
  experimentRecurringRunDetailsRoute,
  experimentRunDetailsRoute,
  experimentsCloneRecurringRunRoute,
  experimentsCloneRunRoute,
  experimentsCreateRecurringRunRoute,
  experimentsCreateRunRoute,
} from './experiments';

export const cloneRecurringRunRoute = (
  namespace: string,
  recurringRunId: string,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentsCloneRecurringRunRoute(namespace, experimentId, recurringRunId)
    : pipelineVersionCloneRecurringRunRoute(
        namespace,
        pipelineId,
        pipelineVersionId,
        recurringRunId,
      );

export const createRecurringRunRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentsCreateRecurringRunRoute(namespace, experimentId)
    : pipelineVersionCreateRecurringRunRoute(namespace, pipelineId, pipelineVersionId);

export const createRunRoute = (
  namespace: string | undefined,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentsCreateRunRoute(namespace, experimentId)
    : pipelineVersionCreateRunRoute(namespace, pipelineId, pipelineVersionId);

export const recurringRunDetailsRoute = (
  namespace: string,
  recurringRunId: string,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentRecurringRunDetailsRoute(namespace, experimentId, recurringRunId)
    : pipelineVersionRecurringRunDetailsRoute(
        namespace,
        pipelineId,
        pipelineVersionId,
        recurringRunId,
      );

export const runDetailsRoute = (
  namespace: string,
  runId: string,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentRunDetailsRoute(namespace, experimentId, runId)
    : pipelineVersionRunDetailsRoute(namespace, pipelineId, pipelineVersionId, runId);

export const cloneRunRoute = (
  namespace: string,
  runId: string,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentsCloneRunRoute(namespace, experimentId, runId)
    : pipelineVersionCloneRunRoute(namespace, pipelineId, pipelineVersionId, runId);
