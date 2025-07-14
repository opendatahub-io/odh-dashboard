import { BaseMetricListResponse } from '#~/api';
import {
  BiasMetricConfig,
  TrustyInstallState,
  TrustyStatusStates,
} from '#~/concepts/trustyai/types';
import { FetchState } from '#~/utilities/useFetchState';
import { TrustyAIKind } from '#~/k8sTypes';
import { getConditionForType } from '#~/concepts/k8s/utils';
import { UseTrustyBrowserStorage } from '#~/concepts/trustyai/content/useTrustyBrowserStorage';

export const formatListResponse = (x: BaseMetricListResponse): BiasMetricConfig[] =>
  x.requests.map((m) => ({
    batchSize: m.request.batchSize,
    favorableOutcome: m.request.favorableOutcome.value,
    id: m.id,
    metricType: m.request.metricName,
    modelId: m.request.modelId,
    name: m.request.requestName ?? `${m.request.metricName}-${m.request.modelId}`,
    outcomeName: m.request.outcomeName,
    privilegedAttribute: m.request.privilegedAttribute.value,
    protectedAttribute: m.request.protectedAttribute,
    thresholdDelta: m.request.thresholdDelta,
    unprivilegedAttribute: m.request.unprivilegedAttribute.value,
  }));

export const getTrustyStatusState = (
  crFetchState: FetchState<TrustyAIKind | null>,
  successDetails?: UseTrustyBrowserStorage,
): TrustyStatusStates => {
  const [cr, loaded, error] = crFetchState;

  if (error) {
    return { type: TrustyInstallState.INFRA_ERROR, message: error.message };
  }

  if (!loaded) {
    return { type: TrustyInstallState.LOADING_INITIAL_STATE };
  }

  if (!cr) {
    // No CR, uninstalled
    return { type: TrustyInstallState.UNINSTALLED };
  }

  /* Have CR, determine the state from it */

  // If in the first 3 seconds, assume the CR is not settled
  // TODO: Remove logic when the backend can provide a proper conditional check state at all times
  const isInStartupGraceWindow = cr.metadata.creationTimestamp
    ? Date.now() - new Date(cr.metadata.creationTimestamp).getTime() <= 3000
    : false;
  if (isInStartupGraceWindow) {
    return { type: TrustyInstallState.INSTALLING };
  }

  if (cr.metadata.deletionTimestamp) {
    return { type: TrustyInstallState.UNINSTALLING };
  }

  const availableCondition = getConditionForType(cr, 'Available');
  if (availableCondition?.status === 'True' && cr.status?.phase === 'Ready') {
    // Installed and good to go
    return {
      type: TrustyInstallState.INSTALLED,
      showSuccess: !!successDetails?.showSuccess,
      onDismissSuccess: successDetails?.onDismissSuccess,
    };
  }

  const dbAvailableCondition = getConditionForType(cr, 'DBAvailable');
  if (dbAvailableCondition?.status === 'False') {
    if (dbAvailableCondition.reason === 'DBConnecting') {
      // DB is still being determined
      return { type: TrustyInstallState.INSTALLING };
    }

    // Some sort of DB error -- try to show specifically what it is
    return {
      type: TrustyInstallState.CR_ERROR,
      message: `${dbAvailableCondition.reason ?? 'Unknown reason'}: ${
        dbAvailableCondition.message ?? 'Unknown error'
      }`,
    };
  }

  if (availableCondition?.status === 'False') {
    // Try to present the generic error as one last fallback
    return {
      type: TrustyInstallState.CR_ERROR,
      message: availableCondition.message ?? availableCondition.reason ?? 'Unknown available error',
    };
  }

  // Not ready -- installing? -- wait for next update
  return { type: TrustyInstallState.INSTALLING };
};
