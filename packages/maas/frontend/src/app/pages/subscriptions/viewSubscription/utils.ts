import { FlowControlStatusReason, ModelSubscriptionRef } from '~/app/types/subscriptions';
import { formatTokenRateLimitLine } from '~/app/utilities/rateLimits';
import { PhaseStatus } from '~/app/utilities/phaseLabelUtils';

export const findModelSubscriptionRef = (
  modelRefs: ModelSubscriptionRef[],
  namespace: string,
  name: string,
): ModelSubscriptionRef | undefined =>
  modelRefs.find((r) => r.namespace === namespace && r.name === name);

export const formatTokenLimits = (
  modelRefs: ModelSubscriptionRef[],
  namespace: string,
  name: string,
): string[] => {
  const ref = findModelSubscriptionRef(modelRefs, namespace, name);
  const limits = ref && Array.isArray(ref.tokenRateLimits) ? ref.tokenRateLimits : [];
  return limits.map(({ limit, window }) => formatTokenRateLimitLine(limit, window));
};

/** Maps per-model flowControlStatuses.ready to a PhaseLabel phase string. */
export const getModelFlowControlPhase = (
  ref: ModelSubscriptionRef | undefined,
): string | undefined => {
  if (ref?.ready === undefined) {
    return undefined;
  }
  switch (ref.reason) {
    case FlowControlStatusReason.ObjectiveFailure:
    case FlowControlStatusReason.Unsupported:
    case FlowControlStatusReason.ReconcileFailed:
    case FlowControlStatusReason.ObjectiveConflict:
    case FlowControlStatusReason.InferenceObjectiveAPIUnavailable:
    case FlowControlStatusReason.NotOnTenantGateway:
      return PhaseStatus.FAILED;
    case FlowControlStatusReason.NotApplicable:
    case FlowControlStatusReason.Unmanaged:
    case FlowControlStatusReason.NoObjectiveRequired:
    case FlowControlStatusReason.ObjectiveReconciled:
    case FlowControlStatusReason.Reconciled:
      return PhaseStatus.READY;
    case FlowControlStatusReason.PoolPending:
    case FlowControlStatusReason.ObjectivePending:
    case FlowControlStatusReason.PendingPoolDiscovery:
      return PhaseStatus.PENDING;
  }
  return ref.ready ? PhaseStatus.READY : PhaseStatus.PENDING;
};
