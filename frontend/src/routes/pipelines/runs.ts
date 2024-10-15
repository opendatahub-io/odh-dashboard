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
    : pipelineVersionDuplicateRecurringRunRoute(
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

export const duplicateRunRoute = (
  namespace: string,
  runId: string,
  experimentId: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  experimentId
    ? experimentsDuplicateRunRoute(namespace, experimentId, runId)
    : pipelineVersionDuplicateRunRoute(namespace, pipelineId, pipelineVersionId, runId);
